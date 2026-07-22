# Feature: Link & Lock Chunk Skipping

## Goal

Make sparse criteria plus unrelated global sorting performant at large index sizes by using exact, cursor-safe data skipping over the unified index table. Skipping metadata may admit false positives but must never create false negatives.

## Phase 1: Resolve the storage and correctness model

- [x] Reject position-numbered blocks because inserts would rename them.
- [x] Anchor blocks to immutable intervals in the persisted sortable-key space.
- [x] Choose sparse `criterion chunk -> sort block` occupancy cells instead of document-id duplication.
- [x] Require occupancy removal only with concurrency-safe proof; otherwise retain a safe false positive until compaction.
- [x] Type-tag string and numeric document/entity identities so `123` and `"123"` cannot share a physical key.
- [x] Reuse the versioned structural identity codec and isolate occupancy records with their own namespace.
- [ ] Define public numeric and string block/chunk configuration and defaults.
- [ ] Define the public TypeInfo configuration that explicitly links criterion fields to supported sort fields.
- [ ] Define the summary-before-range-entry write protocol and failure recovery.
- [ ] Define immediate derived-row cleanup plus safe occupancy compaction/rebuild generations.

## Phase 2: Resolve query execution

- [ ] Define range-to-chunk covering with a strict query fan-out budget.
- [ ] Define ordered block union/intersection for nested `AND`/`OR` criteria.
- [ ] Define block-aware ascending/descending cursor state.
- [ ] Define fallback behavior when skipping is absent, stale, too broad, or over budget.
- [ ] Prove no-false-negative behavior for inserts, updates, deletes, retries, and concurrent queries.

## Phase 3: Implement public contracts and codecs

- [ ] Add versioned unified-table namespaces and key factories for occupancy cells and generations.
- [ ] Export block/chunk config, identities, cursors, diagnostics, and maintenance types.
- [ ] Implement order-preserving block/chunk codecs with key-size validation.
- [ ] Add API comments describing costs, guarantees, and configuration tradeoffs.

## Phase 4: Implement backend parity

- [ ] Implement DynamoDB occupancy writes, queries, retries, and generation activation.
- [ ] Implement equivalent in-memory block/chunk indexes and cursors.
- [ ] Extend the DynamoDB-shaped shared-map client to cover skipping access patterns.
- [ ] Integrate block traversal into structured sort-first search.

## Phase 5: Validate and demonstrate

- [ ] Add correctness tests for boundaries, Unicode, negative/decimal numbers, ties, and reverse order.
- [ ] Add mutation/failure/concurrency tests proving no false negatives.
- [ ] Add sparse large-data tests that measure examined candidates and skipped blocks.
- [ ] Add multi-criterion and multi-page cursor regressions.
- [ ] Define and test migration/backfill, generation activation, and old-generation retirement.
- [ ] Update the ledger, indexing guide, demo/E2E cases, and IaC-facing configuration.
- [ ] Run the complete package, test, documentation, IaC, API, and demo validation matrix.

## Initial invariants

- A block is an immutable interval of the same encoded value space used by the structured range index; it is never a mutable page number or item offset.
- An occupancy cell states only that a criterion chunk may have at least one document inside a sort block.
- Normal writes create cells before exposing new range entries and immediately remove obsolete term/range rows after the canonical state changes.
- An occupancy cell is removed only when Voltra has a concurrency-safe proof that no live entry still contributes to it; otherwise it remains until generational compaction.
- Therefore stale occupancy metadata can increase reads but cannot hide a matching document, and stale cells are reclaimable rather than permanent.
- Query planning has a bounded fan-out. If a safe skipping plan cannot be produced within the budget, Voltra resumes the correct baseline ordered traversal.

## Runtime prerequisites completed in PR #389

- [x] Implement typed scalar identity encoding across unified Dynamo keys, S3 exact keys, in-memory membership/cache keys, and cursors.
- [x] Preserve numeric document IDs through indexing, search results, and cursor continuation.
- [x] Verify immediate cleanup of obsolete structured term/range and full-text posting/position rows in the Dynamo-shaped shared-map client.
- [x] Enforce exact `pk`/`sk` delete-key shape in that client and remove the invalid extra lossy-posting delete attribute.

## Resolved key and lifecycle decisions

- User-controlled identity segments are URI-component encoded exactly once by centralized key factories; raw delimiters such as `#` never define structure.
- Sortable values use the existing order-preserving string/number codecs, not URI encoding.
- Document/entity IDs include a scalar type tag before their encoded value.
- Each occupancy cell contains no document IDs; it records only a possible criterion-chunk/sort-block intersection.
- Create/update ordering is occupancy first, range entry second, committed document version last.
- Obsolete derived term/range rows are removed immediately after the canonical state changes.
- Empty occupancy is removed immediately only when a concurrency-safe proof is available; all other stale cells are reclaimed by a generation rebuild, activation, and retirement cycle.
- Queries and cursors pin the active occupancy generation until that generation's retention window expires.
