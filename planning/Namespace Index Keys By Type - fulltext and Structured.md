# Voltra Plan — Namespace Index Keys by Type (Fulltext + Structured)

## Objective

Prevent index collisions when multiple types share the same field name by **scoping all index keys by typeName** (at
minimum for **fulltext** and **structured** indexing). This must update **index writes** and **index reads**
consistently, and update DBX tests to cover multi-type collisions.

Non-goal: wiping/reseeding the demo DB (RyAnne will do that).

---

## Scope

### Must update

* Fulltext index key encoding / decoding used for DDB persistence.
* Structured index key encoding / decoding (term + range).
* Any callers that currently pass only `fieldName` into these encoders.
* DBX E2E suites: add and/or update applicable coverage.

### Must not break

* Existing query flows (exact/lossy/fulltext/structured) for single-type use.
* Relationship indexing.

---

## Step 1 — Audit: find all key builders and entry points

Search for usages of:

* `encodeTokenKey(`
* `buildStructuredTermKey(`
* `structuredRangeIndexSchema` (partition key usage)
* Any `pk = f#` / `termKey =` / `field:` assignments related to index items

Record:

* Where typeName is currently available at call sites.
* Where only fieldName is available.

Deliverable: short checklist of files + functions that need signature changes. (For your tracking during this plan.)

### Audit findings (Step 1)

- [ ] Fulltext key encoders + call sites (identified)
  - [ ] `src/api/Indexing/fulltext/Schema.ts`: `encodeTokenKey`, `encodeDocMirrorKey`, `encodeDocTokenSortKey`, `encodeDocTokenPositionSortKey` (all derive from indexField).
  - [ ] `src/api/Indexing/fulltext/FullTextDdbBackend.ts`: all uses of `encodeTokenKey(...)` (token stats, lossy/exact postings, doc tokens). Calls only have `indexField` today.
  - [ ] `src/api/Indexing/API.ts`: `indexDocument`, `removeDocument`, `searchLossy`, `searchExact` accept `indexField` only.
  - [ ] `src/api/Indexing/Handler.ts`: handler forwards `indexField` only.
  - [ ] `src/api/ORM/TypeInfoORMService.ts`: `indexFullTextDocument` / `removeFullTextDocument` and list/search (`searchLossy`/`searchExact`) have `typeName` available before passing `indexField`.
  - [ ] `src/api/Indexing/fulltext/FullTextMemoryBackend.ts` and `src/api/Indexing/lossy/*`, `src/api/Indexing/exact/*`: use `indexField` as a key component; will inherit any qualification applied upstream.
- [ ] Structured key builders + call sites (identified)
  - [ ] `src/api/Indexing/structured/StructuredDdb.ts`: `buildStructuredTermKey`, `buildStructuredTermItem`, `buildStructuredRangeItem` use bare `field`.
  - [ ] `src/api/Indexing/structured/StructuredDdbBackend.ts`: term queries call `buildStructuredTermKey(field, ...)`; range queries use `field` as partition key value; writer persistence uses `entry.field`.
  - [ ] `src/api/Indexing/structured/StructuredWriter.ts`: builds term/range entries from `StructuredDocFieldsRecord` keys (currently bare `field`).
  - [ ] `src/api/Indexing/structured/StructuredInMemoryBackend.ts` + `src/api/Indexing/structured/StructuredInMemoryIndex.ts`: index lookups keyed by `field`.
  - [ ] `src/api/ORM/TypeInfoORMService.ts`: `buildStructuredFields` and `applyStructuredFieldMap` have `typeName` available before calling `structured.writer` / `searchStructured`.
  - [ ] `src/api/ORM/indexing/criteriaToStructuredWhere.ts`: builds `Where` with `fieldName` only; type name is available upstream.

---

## Step 2 — Decide and implement namespacing approach

### Preferred approach (minimal schema change in code, maximal clarity)

Treat “field” as **fully-qualified** everywhere the DDB index layer persists/queries:

* `indexFieldQualified = `${typeName}.${fieldName}`

Do this for:

* Fulltext token keys
* Structured term keys
* Structured range keys

This avoids introducing new DDB attributes; it simply changes the content of existing `field` / `indexField` segments.

### Rules

* Never store a bare `fieldName` in index keys.
* Reads must mirror writes exactly.
* Keep the helper that builds qualified names in one place (shared utility).

### Step 2 progress

- [x] Added shared helper `qualifyIndexField(typeName, fieldName)` in `src/api/Indexing/fieldQualification.ts` and exported it from `src/api/Indexing/index.ts`.

---

## Step 3 — Implement: Fulltext

### 3.1 Update key encoder/decoder

Update fulltext schema helper(s) to include `typeName`:

* `encodeTokenKey(typeName, fieldName, token)` OR accept already-qualified field.

If decode is used anywhere, ensure it parses the type-qualified field correctly.

### 3.2 Update all call sites

Where fulltext indexing writes or queries tokens, ensure it supplies:

* `typeName`
* `fieldName`

(or supplies pre-qualified field, consistently).

### 3.3 Verify search paths

* Fulltext search must query only within the qualified field space.

### Step 3 progress

- [x] Apply type-qualified fulltext fields in ORM indexing/search paths.
  - [x] `src/api/ORM/TypeInfoORMService.ts`: qualify `indexField` with `typeName` for `indexDocument`, `removeDocument`, and `searchLossy`/`searchExact` calls (using `indexFieldQualified`).
  - [x] `src/api/Indexing/API.ts`: added `indexFieldQualified` for index/remove to keep document field access unqualified.
  - [x] `src/api/Indexing/Handler.ts`: pass through `indexFieldQualified` for handler indexing/removals.
  - [x] `src/api/Indexing/fulltext/Schema.ts`: updated docs to require type-qualified indexField for multi-type use.

---

## Step 4 — Implement: Structured (term + range)

### 4.1 Update term key builder

Update `buildStructuredTermKey` to include `typeName` (or qualified field).

### 4.2 Update range partitioning

Range index items currently partition by `field`.
Update so the DDB partition key value becomes:

* `${typeName}.${fieldName}`

This keeps schema unchanged but eliminates collisions.

### 4.3 Update all call sites

Any structured index write/read must pass typeName (or qualified field).

---

## Step 5 — Cross-check: Other indexing layers

Confirm these do NOT require changes:

* Relational indexing (should already scope by entityId/edge semantics)
* Exact/lossy if they already use `resolveIndexKey` / type scoping

If any other index layer persists by only `fieldName`, apply the same qualification rule.

---

## Step 6 — DBX test suite updates

### 6.1 Add new multi-type fixtures

Create two TypeInfos with a shared field name, e.g.:

* `Author.lastName`
* `Customer.lastName`

Seed deterministic items:

* Author: lastName = "Adams"
* Customer: lastName = "Adams"

### 6.2 Assertions

For each query mode that uses these indexes:

* Searching `Author.lastName = "Adams"` returns only Authors
* Searching `Customer.lastName = "Adams"` returns only Customers

Cover:

* Structured exact term lookup
* Structured range (if applicable)
* Fulltext search (if lastName is fulltext-indexed in DBX scenario)

### 6.3 Regression check

Ensure existing DBX CRUD + relationship tests still pass.

---

## Acceptance criteria

* Solution/fix/refactor must be holistic and thoughtful.
* Index keys are type-scoped for fulltext + structured.
* Two types sharing a field name no longer collide.
* DBX suite includes and passes multi-type collision tests.
