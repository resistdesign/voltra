# DBX: E2E / Full-Scale Integration API Testing Plan (In-Memory, Local + CI)

## Objective
Prove (not assume) that Voltra’s database + indexing stack works end-to-end for real product usage:
- CRUD + paging + stable ordering
- Search (exact, lossy, full-text, structured)
- Relationships (list + resolve + paging + missing handling)
- Validation (clear errors, consistent across API + UI)
- Aggregates/reports (realtime + long-running + cancel + fetch results)
- Scale/perf (predictable behavior under normal datasets)

Constraints:
- **In-memory drivers only** (no DynamoDB/S3 required)
- Runs locally via `yarn test` and in GitHub Actions
- Data sizes tuned for signal without overwhelming CI

---

## Codex Operating Rules
- Follow repo’s JSON spec testing approach: `src/**/*.spec.json` + `*.test-utils.ts` exports.
- Keep new tests close to the feature area they validate.
- Prefer “scenario style” tests: one spec = one realistic story; assertions reflect user outcomes.

---

## Phase 0 — Repo Recon (required before coding)
Codex should inventory:
1. The JSON spec runner contract (how it loads `file`, calls `export`, evaluates `operation`).
2. The API routing entrypoint used in production (Router types + handler factories).
3. Existing in-memory DB drivers:
   - `InMemoryDataItemDBDriver`
   - `InMemoryItemRelationshipDBDriver`
   - Any existing memory backend for indexing (full-text already has one).
4. How indexing is currently wired for exact/lossy/fulltext/structured:
   - What expects S3/DDB
   - What can be swapped behind interfaces

Deliverable: a short internal note in the plan doc (or a new `planning/dbx-e2e-notes.md`) listing the concrete entrypoints/interfaces to use.

---

## Phase 1 — Build the E2E Test Harness (the foundation)
Create a small “scenario harness” that can:
- Build an **in-memory Voltra runtime** (ORM + Indexing + Relationships) with one config object.
- Invoke routes through the **same router/handler path** the cloud function uses.
- Provide a lightweight “request runner” that accepts:
  - method + path + headers + auth + body
  - returns status + body + error

### Phase 1 Progress
- [x] 1A: Add DBXRuntime + DBXRequest + DBXTypes scaffolding
- [x] 1A: Add DBXSeed + DBXAsserts helpers
- [x] 1A: Add DBXTypes exports/index entrypoints

### 1A) Scenario Harness module
Add a folder (choose one and stick to it):
- `src/api/DBX/` (preferred) OR `src/api/Testing/DBX/`

Files:
- `DBXRuntime.ts` — builds runtime/config using in-memory drivers
- `DBXRequest.ts` — helper to run a request through the router
- `DBXSeed.ts` — deterministic dataset generation
- `DBXAsserts.ts` — reusable assertions (paging invariants, stable ordering, etc.)
- `DBXTypes.ts` — scenario result types

### 1B) Deterministic data generation
Create `makeDbxDataset(seed, size)` producing:
- Items with:
  - unique IDs
  - structured fields (numbers, dates, enums)
  - text bodies (short + long)
  - overlapping tokens to stress indexes
  - edge cases: punctuation, casing, repeated tokens
- Relationship graph:
  - parent/child chains
  - many-to-many links
  - some dangling relationships to deleted/missing items

Dataset sizes (use env var or scenario flag):
- `SMALL=50` (default CI)
- `MED=200`
- `LARGE=1000` (extended suite / optional CI job)

### 1C) In-memory indexing adapters
Goal: exact/lossy/fulltext/structured can all run without AWS.

Actions:
- Keep full-text on its existing memory backend.
- For exact + lossy:
  - Implement minimal in-memory backends that satisfy the same interfaces used by `ExactIndex` / `LossyIndex`.
  - If the code is hard-wired to S3/DDB implementations, introduce a small interface boundary (adapter) so tests can inject memory.

Deliverable: `ExactMemoryBackend.ts` + `LossyMemoryBackend.ts` (or similar) and a `buildIndexingConfig({ backend: "memory" })` path.

Status note:
- Full-text already uses `FullTextMemoryBackend` (built from `LossyIndex` + `ExactIndex`), and DBX runtime defaults to it, so no additional adapters were required.

---

## Phase 2 — DBX Scenario Specs (map directly to the epic checklist)
Each scenario is implemented as:
- `*.test-utils.ts` export `runXScenario()` returning a **plain JSON result**
- `*.spec.json` using `DEEP_EQUALS` (or existing ops) with clear expected values

### Naming convention
- File prefix: `DBX_`
- Scenario ID: `crud`, `search_exact`, `search_lossy`, `search_fulltext`, `search_structured`, `relationships`, `validation`, `aggregates`, `scale`

Example paths:
- `src/api/DBX/DBX_CRUD_E2E.spec.json`
- `src/api/DBX/DBX_CRUD_E2E.test-utils.ts`

### 2A) Item CRUD scenarios
**DBX_CRUD_E2E**
- Create N items via API
- Read by ID
- Update subset; verify unchanged fields not corrupted
- Delete subset; verify not listed, not searchable, relationships cleaned if applicable
- List paging invariants:
  - stable ordering across pages
  - consistent page sizes
  - cursor/lastKey works

Expected outputs (asserted):
- counts per operation
- sample items (before/after)
- paging transcript (page cursors + IDs)

### 2B) Indexing & Searching scenarios
**DBX_SEARCH_EXACT_E2E**
- Seed items with controlled token overlap
- Search exact term; verify precise match set
- Update an item’s indexed field; verify search results change appropriately
- Delete; verify removed from results

**DBX_SEARCH_LOSSY_E2E**
- Queries that are partial/fuzzy; verify “reasonable” results using deterministic expectations
  - define “reasonable” as a fixed expected set for the chosen dataset

**DBX_SEARCH_FULLTEXT_E2E**
- Search within long text bodies
- Verify ranking/order if your engine defines it; otherwise verify membership + stable ordering

**DBX_SEARCH_STRUCTURED_E2E**
- Equality filters
- Range queries
- Combined filters

Expected outputs:
- query → result IDs (and any score if applicable)
- proof that CRUD mutates indexes correctly

### 2C) Relationships scenarios
**DBX_RELATIONSHIPS_E2E**
- Create relationships via API
- List relationships by item (paging)
- Resolve to actual related items
- Delete a target item; ensure relationship resolution is graceful (explicit missing markers)

Expected outputs:
- relationship edges created
- list transcript (paged)
- resolved items vs missing

### 2D) Validation scenarios
**DBX_VALIDATION_E2E**
- Bad payloads for create/update
- Confirm errors are:
  - consistent shape
  - actionable messages
  - consistent across endpoints

Expected outputs:
- error codes + messages
- field-level error maps if supported

### 2E) Aggregates & Reports scenarios
**DBX_AGGREGATES_E2E**
- Realtime aggregate: e.g., count by enum, sum by numeric field
- Long-running report:
  - start job → get jobId
  - poll/track status
  - cancel job
  - re-run and fetch results

Implementation note:
- If the production code doesn’t yet expose a job system, codify this scenario as a failing/expected TODO (or implement a minimal in-memory job runner behind the same interface the cloud version will use).

Expected outputs:
- aggregate values
- job lifecycle transcript

### 2F) Scale & Performance scenarios
**DBX_SCALE_E2E**
- Run CRUD + a representative search query set on MED/LARGE
- Capture timings (coarse) and key counts

Rules:
- Don’t assert absolute milliseconds in CI.
- Do assert:
  - operations complete
  - complexity doesn’t explode unexpectedly (e.g., no O(n^2) obvious blowups)
  - optional: assert upper-bound relative ratios between SMALL and MED

Expected outputs:
- operation timing buckets
- dataset size metadata

---

## Phase 3 — CI Integration
- Ensure `yarn test` runs the new specs automatically.
- Add a second optional workflow/job for LARGE datasets:
  - triggered by label, manual dispatch, or nightly schedule
- Keep default PR CI running SMALL only.

---

## Phase 4 — Developer Experience
Add a short doc:
- `planning/dbx-e2e-how-to-run.md` (or `docs/` if preferred)

Include:
- how to run just DBX tests
- how to switch dataset sizes
- how to regenerate fixtures if `yarn test:gen` is used

---

## Acceptance Criteria
This work is done when:
- DBX scenarios exist for every checklist section (CRUD, searching, relationships, validation, aggregates, scale)
- All tests run **locally** with no AWS creds
- All tests run in **GitHub Actions** on PRs (SMALL)
- Extended run exists (MED/LARGE) without destabilizing normal CI
- Failures are readable and point to a user-facing regression (not a brittle internal assertion)

---

## Work Checklist (Codex should keep this live while implementing)
- [x] Phase 0: Inventory runner + route entrypoint + interfaces
- [x] Phase 1: Build DBX runtime + request runner + deterministic seed
- [x] Phase 1: Add memory backends/adapters for exact/lossy (if needed)
- [x] Phase 2: CRUD scenario spec
- [x] Phase 2: Exact search scenario spec
- [x] Phase 2: Lossy search scenario spec
- [x] Phase 2: Full-text scenario spec
- [ ] Phase 2: Structured search scenario spec
- [ ] Phase 2: Relationships scenario spec
- [ ] Phase 2: Validation scenario spec
- [ ] Phase 2: Aggregates/reports scenario spec
- [ ] Phase 2: Scale/perf scenario spec
- [ ] Phase 3: CI wiring for SMALL + optional extended job
- [ ] Phase 4: How-to-run doc
