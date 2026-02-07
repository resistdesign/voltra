- [ ] **Goal**: In the demo site E2E, structured filter operator **Like** must work when **Text Mode = Exact** (and generally), e.g. `Car.model Like "Hon"` should match `"Honda"`.

- [ ] **Repro (baseline)**
  - [ ] In demo site: Search Cars → Structured Filters → field `model` → operator `Like` → value `Hon` → Run Search → observe 0 results.
  - [ ] Confirm that `model = "Honda"` exists in seeded data.

- [ ] **Root cause confirmation**
  - [ ] Locate conversion from criteria → structured where (likely `criteriaToStructuredWhere`).
  - [ ] Trace how `Like` is represented in DBX structured query (often `mode: "contains"` or equivalent).
  - [ ] Inspect structured indexing writer: verify **strings do not emit any "contains" tokens**, only `eq` (or exact) entries.
  - [ ] Confirm the structured query is asking for tokens that never exist → guaranteed miss.

- [ ] **Design decision (non-negotiable)**
  - [ ] Implement **SQL-style LIKE semantics** for structured string fields, without surprises:
    - [ ] Case-insensitive by default (matching existing Voltra search normalization).
    - [ ] Treat the filter value as a **substring match** unless it contains explicit wildcards.
    - [ ] Support `%` = any-length wildcard and `_` = single-character wildcard.
    - [ ] If no wildcard is provided by the caller, behave like: `LIKE "%<value>%"` (contains).
    - [ ] Do **not** reinterpret LIKE as full-text search ranking; it must be deterministic boolean filtering.
    - [ ] Arrays retain existing semantics (match any element; consistent with prior behavior).
  - [ ] Implementation must preserve consumer expectations across ORMs/clients.

- [ ] **Implementation plan (required)**
  - [ ] **Tokenization rules (minimal + predictable)**
    - [ ] Normalize: lowercase, trim, collapse internal whitespace to single space.
    - [ ] Token strategy: choose one and document it:
      - [ ] **Trigrams** over normalized string (recommended for contains)
      - [ ] OR **prefix tokens** (simpler; better for starts-with, worse for true contains)
    - [ ] Decide max length / guardrails (e.g., do not generate tokens for strings shorter than N; handle N<3 sensibly).

  - [ ] **Write-side: structured indexing**
    - [ ] Find structured index writer (e.g. `src/api/Indexing/structured/*Writer*`).
    - [ ] When indexing a **string field**:
      - [ ] Always write `eq` (existing behavior).
      - [ ] Additionally write `contains` tokens using the chosen strategy.
      - [ ] Ensure tokens are written under the same field key/path so query can match.
      - [ ] Ensure deterministic ordering / de-duping to avoid excessive writes.
    - [ ] If there is an in-memory structured backend/index (tests): mirror the same logic.

  - [ ] **Read-side: criteria → structured query**
    - [ ] In criteria conversion (e.g. `src/api/ORM/indexing/criteriaToStructuredWhere.ts`):
      - [ ] Map operator `Like` to `contains` mode.
      - [ ] Apply the same normalization/tokenization to the query value.
      - [ ] For contains token set:
        - [ ] Generate tokens from the query string.
        - [ ] For token-based contains, query must require **ALL tokens** (AND) for one field value to match.
    - [ ] Preserve existing behavior for arrays.

  - [ ] **Compatibility: Text Mode = Exact**
    - [ ] Ensure the UI “Text Mode” affects only the free-text portion, not structured filters.
    - [ ] If current code wrongly couples text mode into structured behavior:
      - [ ] Decouple so structured Like always uses structured tokens.

- [ ] **Tests (must be added/updated)**
  - [ ] Add/extend unit tests for criteria conversion:
    - [ ] `model Like "Hon"` produces a `contains` structured query with expected tokens.
    - [ ] Case-insensitivity: `"hon"`, `"HON"` behave identically.
    - [ ] Short input edge cases: `"H"`, `"Ho"` (define expected behavior).
  - [ ] Add/extend structured backend tests:
    - [ ] Index `Car.model = "Honda"` then query `Like "Hon"` returns the item.
    - [ ] Negative control: query `Like "Toy"` does not return Honda.
  - [ ] If there are DBX/e2e tests: add a small scenario for structured Like on a string field.

- [ ] **Migration / demo data**
  - [ ] Note: existing demo DB/indexes won’t have new `contains` tokens for strings.
  - [ ] Update seeding/reindex instructions used by CI or local dev (do not wipe automatically unless project conventions already do).
  - [ ] If the demo pipeline already recreates DB, ensure it triggers a fresh index build.

- [ ] **Performance + cost guardrails**
  - [ ] Token explosion check:
    - [ ] Cap tokens per string (e.g., max trigrams) or cap indexed string length.
    - [ ] Deduplicate tokens.
  - [ ] Ensure write path doesn’t exceed DynamoDB item size limits for pathological strings.

- [ ] **Acceptance criteria**
  - [ ] Demo site: `Car.model Like "Hon"` returns Honda(s) regardless of Text Mode setting.
  - [ ] All unit/in-memory/DBX tests pass.
  - [ ] Clear inline doc/comments explaining chosen token strategy and any caps.

- [ ] **Suggested file targets (adjust to actual repo layout)**
  - [ ] `src/api/ORM/indexing/criteriaToStructuredWhere.ts`
  - [ ] `src/api/Indexing/structured/*Writer*.ts`
  - [ ] `src/api/Indexing/structured/*InMemory*.ts` (if present)
  - [ ] Corresponding `*.spec.*` files

