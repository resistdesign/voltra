# Feature: Link & Lock Chunk Skipping

## Goal

Make sparse criteria plus unrelated global sorting performant at large index sizes by using exact, cursor-safe data skipping over the unified index table. For completed writes, skipping metadata may admit false positives but must never create false negatives. Interrupted optimistic writes converge through retry/repair rather than rollback.

## Remaining design decisions

1. String criterion chunk prefix width and boundary encoding.
2. `AND`/`OR` token-set composition, fan-out budget, and baseline fallback threshold.
3. Ascending/descending block-aware cursor state.
4. Occupancy generation activation/retention, including migration and backfill cutover.

## Phase 1: Resolve the storage and correctness model

- [x] Reject position-numbered blocks because inserts would rename them.
- [x] Anchor blocks to immutable intervals in the persisted sortable-key space.
- [x] Choose sparse `criterion chunk -> sort block` occupancy cells instead of document-id duplication.
- [x] Require occupancy removal only with concurrency-safe proof; otherwise retain a safe false positive until compaction.
- [x] Type-tag string and numeric document/entity identities so `123` and `"123"` cannot share a physical key.
- [x] Reuse the versioned structural identity codec and isolate occupancy records with their own namespace.
- [x] Use decade-sized criterion chunks for ordinary numbers and unit-sized chunks for fields tagged `tags.indexed.decimal`.
- [ ] Define the string criterion prefix/chunk width and boundary encoding.
- [x] Use each persisted exact sortable field token as the immutable sort block; add no second sort-block quantization layer.
- [x] Derive criterion/sort eligibility automatically from scalar structured-indexed string/number TypeInfo fields; add no separate links, opt-in, or opt-out.
- [x] Keep one scalar comparison type per field; mixed string/number unions do not receive a range-ordering contract.
- [x] Include optional sort fields through a deterministic missing-value stream instead of omitting missing documents; present values enter the ordinary ordered stream as soon as they exist.
- [x] Use optimistic, forward-only writes with retries and repair; do not add cross-family transactions, rollback, or atomicity guarantees.
- [x] Remove obsolete derived rows during successful updates/deletes and reclaim unprovably empty occupancy through safe compaction/rebuild generations.
- [ ] Define occupancy generation rebuild activation and retention mechanics.

## Phase 2: Resolve query execution

- [ ] Define range-to-chunk covering with a strict query fan-out budget.
- [ ] Define ordered block union/intersection for nested `AND`/`OR` criteria.
- [ ] Define block-aware ascending/descending cursor state.
- [ ] Define fallback behavior when skipping is absent, stale, too broad, or over budget.
- [ ] Prove steady-state correctness for completed writes and bounded, repairable behavior for interrupted/concurrent optimistic writes.

## Phase 3: Implement public contracts and codecs

- [ ] Add versioned unified-table namespaces and key factories for occupancy cells and generations.
- [ ] Add `tags.indexed.decimal` to the public TypeInfo contract and derived indexing configuration.
- [ ] Export identities, cursors, diagnostics, and maintenance types; chunking otherwise derives from TypeInfo without separate public configuration.
- [ ] Implement order-preserving block/chunk codecs with key-size validation.
- [ ] Add API comments describing costs, guarantees, and configuration tradeoffs.

## Phase 4: Implement backend parity

- [ ] Implement DynamoDB occupancy writes, queries, retries, and generation activation.
- [ ] Implement equivalent in-memory block/chunk indexes and cursors.
- [ ] Extend the DynamoDB-shaped shared-map client to cover skipping access patterns.
- [ ] Integrate block traversal into structured sort-first search.
- [ ] Add one unified mutation coordinator that batches puts/deletes across index families in requests of at most 25 operations and retries unprocessed items.

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
- Writes are optimistic and forward-only. Voltra computes the complete mutation delta, applies/retries it toward the new state, and does not transactionally roll back already-applied index changes.
- Successful updates/deletes immediately remove obsolete real term/range/posting rows. Interrupted writes may leave repairable stale derived rows; canonical field verification prevents those rows from being accepted as exact criterion matches.
- An occupancy cell is removed only when Voltra has a concurrency-safe proof that no live entry still contributes to it; otherwise it remains until generational compaction.
- Stale occupancy metadata can increase reads but cannot itself hide a matching document, and stale cells are reclaimable rather than permanent.
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
- An occupancy cell is a compressed existence fact such as `(age, 20-29, name, token("Zoe")) = occupied`; it allows Voltra to seek directly to that exact token in the existing name range stream, while canonical fields still decide exact matches.
- Every scalar structured-indexed string/number field automatically participates as both a range criterion axis and a sort axis. Arrays, booleans, references, and mixed-type unions do not.
- A field may be both full-text and structurally indexed; full-text participation does not change range-chunk behavior.
- Ordinary numeric values use decade chunks such as `[20, 30)`. A number field tagged `tags.indexed.decimal: true` uses unit chunks, so `22.4549126` belongs to `[22, 23)`.
- The sort side is not separately quantized: its existing exact order-preserving string/number token is the immutable target block. Multiple documents with the same criterion chunk and sort token share one occupancy cell.
- Optional fields with values use their normal range entry. Missing optional sort values remain query-visible through a deterministic missing-value stream and stable document-id ordering.
- Missing values sort after present values in both traversal directions; they enter the normal ordered stream as soon as a value exists.
- Same-field range-and-sort queries already seek one ordered range stream and require no cross-field occupancy cell.
- With `F` eligible structured fields, one document can contribute to at most `F(F - 1)` cross-field chunk/token pairs before shared-cell deduplication. This cost is accepted because each field already opts into it through `structured: true`; there is no additional range-chunk switch.
- The unified physical table permits one coordinator to combine derived puts/deletes from structured, full-text, relationship, and chunk indexing into DynamoDB `BatchWriteItem` calls of at most 25 operations, with unprocessed-item retries.
- Canonical `docFields` optimistic compare-and-swap remains separate from bulk derived writes. Voltra does not provide multi-index transactions or rollback.
- Obsolete derived term/range rows are removed immediately after the canonical state changes.
- Empty occupancy is removed immediately only when a concurrency-safe proof is available; all other stale cells are reclaimed by a generation rebuild, activation, and retirement cycle.
- Queries and cursors pin the active occupancy generation until that generation's retention window expires.
