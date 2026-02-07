- [~] **Goal**: In the demo site E2E, structured filter operator **Like** must work when **Text Mode = Exact** (and generally), e.g. `Car.model Like "Hon"` should match `"Honda"`.

- [~] **Repro (baseline)**
  - [ ] In demo site: Search Cars → Structured Filters → field `model` → operator `Like` → value `Hon` → Run Search → observe 0 results.
  - [ ] Confirm that `model = "Honda"` exists in seeded data.

- [x] **Root cause confirmation**
  - [x] Locate conversion from criteria → structured where (likely `criteriaToStructuredWhere`).
  - [x] Trace how `Like` is represented in DBX structured query (often `mode: "contains"` or equivalent).
  - [x] Inspect structured indexing writer: verify **strings do not emit any "contains" tokens**, only `eq` (or exact) entries.
  - [x] Confirm the structured query is asking for tokens that never exist → guaranteed miss.

- [~] **Design decision (non-negotiable)**
  - [x] Implement **SQL-style LIKE semantics** for structured string fields, without surprises:
    - [x] Case-insensitive by default (matching existing Voltra search normalization).
    - [x] Treat the filter value as a **substring match** unless it contains explicit wildcards.
    - [x] Support `%` = any-length wildcard and `_` = single-character wildcard.
    - [x] If no wildcard is provided by the caller, behave like: `LIKE "%<value>%"` (contains).
    - [x] Do **not** reinterpret LIKE as full-text search ranking; it must be deterministic boolean filtering.
    - [x] Arrays retain existing semantics (match any element; consistent with prior behavior).
  - [~] Implementation must preserve consumer expectations across ORMs/clients.

- [~] **Implementation plan (required)**
  - [x] **Tokenization rules (minimal + predictable)**
    - [x] Normalize: lowercase, trim, collapse internal whitespace to single space.
    - [x] Token strategy: choose one and document it:
      - [x] **Trigrams** over normalized string (recommended for contains)
      - [ ] OR **prefix tokens** (simpler; better for starts-with, worse for true contains)
    - [x] Decide max length / guardrails (e.g., do not generate tokens for strings shorter than N; handle N<3 sensibly).

  - [x] **Write-side: structured indexing**
    - [x] Find structured index writer (e.g. `src/api/Indexing/structured/*Writer*`).
    - [x] When indexing a **string field**:
      - [x] Always write `eq` (existing behavior).
      - [x] Additionally write `contains` tokens using the chosen strategy.
      - [x] Ensure tokens are written under the same field key/path so query can match.
      - [x] Ensure deterministic ordering / de-duping to avoid excessive writes.
    - [x] If there is an in-memory structured backend/index (tests): mirror the same logic.

  - [x] **Read-side: criteria → structured query**
    - [x] In criteria conversion (e.g. `src/api/ORM/indexing/criteriaToStructuredWhere.ts`):
      - [x] Map operator `Like` to `contains` mode.
      - [x] Apply the same normalization/tokenization to the query value.
      - [x] For contains token set:
        - [x] Generate tokens from the query string.
        - [x] For token-based contains, query must require **ALL tokens** (AND) for one field value to match.
    - [x] Preserve existing behavior for arrays.

  - [~] **Compatibility: Text Mode = Exact**
    - [ ] Ensure the UI “Text Mode” affects only the free-text portion, not structured filters.
    - [ ] If current code wrongly couples text mode into structured behavior:
      - [ ] Decouple so structured Like always uses structured tokens.

- [x] **Tests (must be added/updated)**
  - [x] Add/extend unit tests for criteria conversion:
    - [x] `model Like "Hon"` produces a `contains` structured query with expected tokens.
    - [x] Case-insensitivity: `"hon"`, `"HON"` behave identically.
    - [x] Short input edge cases: `"H"`, `"Ho"` (define expected behavior).
  - [x] Add/extend structured backend tests:
    - [x] Index `Car.model = "Honda"` then query `Like "Hon"` returns the item.
    - [x] Negative control: query `Like "Toy"` does not return Honda.
  - [x] If there are DBX/e2e tests: add a small scenario for structured Like on a string field.

- [ ] **Migration / demo data**
  - [ ] Note: existing demo DB/indexes won’t have new `contains` tokens for strings.
  - [ ] Update seeding/reindex instructions used by CI or local dev (do not wipe automatically unless project conventions already do).
  - [ ] If the demo pipeline already recreates DB, ensure it triggers a fresh index build.

- [~] **Performance + cost guardrails**
  - [x] Token explosion check:
    - [x] Cap tokens per string (e.g., max trigrams) or cap indexed string length.
    - [x] Deduplicate tokens.
  - [ ] Ensure write path doesn’t exceed DynamoDB item size limits for pathological strings.

- [~] **Acceptance criteria**
  - [ ] Demo site: `Car.model Like "Hon"` returns Honda(s) regardless of Text Mode setting.
  - [x] All unit/in-memory/DBX tests pass.
  - [x] Clear inline doc/comments explaining chosen token strategy and any caps.

- [x] **Suggested file targets (adjust to actual repo layout)**
  - [x] `src/api/ORM/indexing/criteriaToStructuredWhere.ts`
  - [x] `src/api/Indexing/structured/*Writer*.ts`
  - [x] `src/api/Indexing/structured/*InMemory*.ts` (if present)
  - [x] Corresponding `*.spec.*` files
