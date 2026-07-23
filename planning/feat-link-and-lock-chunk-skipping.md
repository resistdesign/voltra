# Feature: Link & Lock Chunk Skipping

## Goal

Make sparse criteria plus unrelated global sorting performant at large index sizes by using exact, cursor-safe data skipping over the unified index table. For completed writes, skipping metadata may admit false positives but must never create false negatives. Interrupted optimistic writes converge through retry/repair rather than rollback.

## Remaining design decisions

None. The storage, query, cursor, consistency, and lifecycle contracts are resolved; the remaining checklist is implementation and validation work.

## Phase 1: Resolve the storage and correctness model

- [x] Reject position-numbered blocks because inserts would rename them.
- [x] Anchor blocks to immutable intervals in the persisted sortable-key space.
- [x] Choose sparse `criterion chunk -> sort block` occupancy cells instead of document-id duplication.
- [x] Require occupancy removal only with concurrency-safe proof; otherwise retain a safe false positive until compaction.
- [x] Type-tag string and numeric document/entity identities so `123` and `"123"` cannot share a physical key.
- [x] Reuse the versioned structural identity codec and isolate occupancy records with their own namespace.
- [x] Use decade-sized criterion chunks for ordinary numbers and unit-sized chunks for fields tagged `tags.indexed.decimal`.
- [x] Use a case-preserving prefix of at most three Unicode code points for string criterion chunks, with exact short-value buckets and versioned order-preserving boundary encoding.
- [x] Use each persisted exact sortable field token as the immutable sort block; add no second sort-block quantization layer.
- [x] Derive criterion/sort eligibility automatically from scalar structured-indexed string/number TypeInfo fields; add no separate links, opt-in, or opt-out.
- [x] Keep one scalar comparison type per field; mixed string/number unions do not receive a range-ordering contract.
- [x] Include optional sort fields through a deterministic missing-value stream instead of omitting missing documents; present values enter the ordinary ordered stream as soon as they exist.
- [x] Use optimistic, forward-only writes with retries and repair; do not add cross-family transactions, rollback, or atomicity guarantees.
- [x] Remove obsolete derived rows during successful updates/deletes and reclaim unprovably empty occupancy through safe compaction/rebuild generations.
- [x] Define occupancy generation rebuild activation and retention mechanics.

## Phase 2: Resolve query execution

- [x] Query occupied criterion chunks sparsely by encoded chunk range; never enumerate or synthesize every possible chunk key.
- [x] Union occupied sort-token sets within `OR` branches and intersect them across `AND` branches; verify the complete predicate against canonical fields after traversal.
- [x] Resume ordered skipping with an occupancy-generation-pinned phase/token/block cursor; interpret the token boundary in the query's existing ascending or descending direction.
- [x] Bound planning by actual occupancy metadata read, not theoretical range width; restart with exact baseline sort-first traversal when the internal budget is exceeded.
- [x] Prove steady-state correctness for completed writes and bounded, repairable behavior for interrupted/concurrent optimistic writes.

## Phase 3: Implement public contracts and codecs

- [x] Add versioned unified-table namespaces and key factories for occupancy cells and generations.
- [x] Add `tags.indexed.decimal` to the public TypeInfo contract and derived indexing configuration.
- [x] Export identities, cursors, diagnostics, and maintenance types; chunking otherwise derives from TypeInfo without separate public configuration.
- [x] Implement order-preserving block/chunk codecs with key-size validation.
- [x] Add API comments describing costs, guarantees, and configuration tradeoffs.

## Phase 4: Implement backend parity

- [x] Implement DynamoDB occupancy writes, queries, retries, and generation activation.
- [x] Implement equivalent in-memory block/chunk indexes and cursors.
- [x] Extend the DynamoDB-shaped shared-map client to cover skipping access patterns.
- [x] Integrate block traversal into structured sort-first search.
- [x] Add the promised unified mutation coordinator across compatible structured, full-text, relationship, and chunk derived writes, batching requests in groups of at most 25 with unprocessed-item retry.

## Phase 5: Validate and demonstrate

- [x] Add correctness tests for boundaries, Unicode, negative/decimal numbers, ties, and reverse order.
- [x] Add mutation/failure/concurrency tests proving no false negatives.
- [x] Add sparse large-data tests that measure examined candidates and skipped blocks.
- [x] Add multi-criterion and multi-page cursor regressions, including truthful terminal cursor behavior.
- [x] Define and test migration/backfill, generation activation, and old-generation retirement.
- [x] Update the ledger, indexing guide, real demo/E2E cases, migration tooling, and IaC-facing configuration.
- [x] Run the complete package, test, documentation, IaC, API, and demo validation matrix after audit remediation.

## Deep-audit remediation (2026-07-22)

- [x] Reconcile the attached main/gh-pages snapshots, local implementation tree, and published PR #389 tree.
- [x] Reproduce and repair stale missing-row duplicates, descending Dynamo tie order, same-field range seeking, typed missing-ID ordering, and terminal occupancy cursors.
- [x] Complete cross-family derived-write coordination without adding transactions or rollback.
- [x] Wire TypeInfo-derived occupancy into the real demo and add ORM/E2E coverage for ordered skipping.
- [x] Make rebuild reconciliation and activation operationally complete, then document the exact migration command/path.
- [x] Remove stale implementation-status prose and update the PR description/test evidence.
- [x] Run the complete validation matrix and publish the audited tree.

## Deep-audit validation evidence (2026-07-22)

- Core: 916 passed, 0 failed.
- Native: 58 passed, 0 failed.
- Medium DBX: 6 passed, 0 failed.
- TypeScript, package bundle, declarations, package exports, consumer install/import smoke, TypeDoc, demo API/type generation, IaC generation, and Astro production build passed.
- Focused regressions cover stale missing rows, descending Dynamo ties, typed missing-ID order, direct same-field seeks, truthful terminal cursors, real ORM occupancy routing, generation rebuild/no-op/empty-scope behavior, 25-operation batch caps, concurrent coordinator isolation, and the first post-upgrade full-text mutation of legacy pre-mirror rows.

## Initial invariants

- A block is an immutable interval of the same encoded value space used by the structured range index; it is never a mutable page number or item offset.
- An occupancy cell states only that a criterion chunk may have at least one document inside a sort block.
- Writes are optimistic and forward-only. Voltra computes the complete mutation delta, applies/retries it toward the new state, and does not transactionally roll back already-applied index changes.
- Successful updates/deletes immediately remove obsolete real term/range/posting rows. Interrupted writes may leave repairable stale derived rows; canonical field verification prevents those rows from being accepted as exact criterion matches.
- An occupancy cell is removed only when Voltra has a concurrency-safe proof that no live entry still contributes to it; otherwise it remains until generational compaction.
- Stale occupancy metadata can increase reads but cannot itself hide a matching document, and stale cells are reclaimable rather than permanent.
- Query planning performs sparse range reads and is bounded by actual occupancy cells/pages read, never by the theoretical count of possible chunks. If the internal metadata budget is exceeded, Voltra discards the partial skip plan and restarts with the correct baseline ordered traversal before emitting results.
- A skipping cursor stores the pinned occupancy generation, `present`/`missing` phase, last exact sort-token boundary, and backend continuation within that token. The unchanged query supplies direction. Ascending resumes after the boundary toward higher tokens; descending resumes before it toward lower tokens. If mutation removed the boundary token, traversal seeks from that boundary rather than requiring the token to still exist.
- Normal document mutations update the active generation in place and do not invalidate cursors. Only explicit occupancy rebuild/schema activation changes the generation; a cursor for any non-active generation returns zero results and no successor cursor.

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
- Structured string criterion chunks use the first one to three Unicode code points of the exact sortable value, preserving case. Values longer than three code points share their three-code-point prefix bucket; shorter values, including the empty string, use an exact short-value bucket.
- String chunking uses the structured sortable value and order-preserving codec. It does not lowercase, tokenize, or inherit widths from full-text or structured `LIKE`; the existing case-sensitive fallback behavior for `LIKE` remains outside this subsystem.
- A three-code-point prefix bucket represents its contiguous lexicographic prefix interval. The versioned chunk identity distinguishes exact short-value buckets from prefix intervals and never splits a Unicode surrogate pair.
- Ordinary numeric values use decade chunks such as `[20, 30)`. A number field tagged `tags.indexed.decimal: true` uses unit chunks, so `22.4549126` belongs to `[22, 23)`.
- The sort side is not separately quantized: its existing exact order-preserving string/number token is the immutable target block. Multiple documents with the same criterion chunk and sort token share one occupancy cell.
- Optional fields with values use their normal range entry. Missing optional sort values remain query-visible through a deterministic missing-value stream and stable document-id ordering.
- Missing values sort after present values in both traversal directions; they enter the normal ordered stream as soon as a value exists.
- Same-field range-and-sort queries already seek one ordered range stream and require no cross-field occupancy cell.
- Occupancy storage is range-queryable by encoded criterion chunk beneath the generation/type/criterion-field/sort-field identity. One backend range query therefore returns only cells that actually exist between the requested chunk boundaries; empty possible chunks cause no individual reads.
- Each criterion leaf produces a set of occupied exact sort tokens. Nested `OR` unions these sets and nested `AND` intersects them. The same sort token may be contributed by different documents, so composition is deliberately coarse and canonical predicate verification remains authoritative.
- The metadata budget counts actual occupancy cells read, with a secondary backend-page guard. It is an internal implementation constant selected and tuned by scale tests, not public TypeInfo configuration. Crossing it produces no partial output: Voltra abandons the skip plan and restarts the existing exact sort-first traversal.
- The opaque skipping cursor contains only `{ generation, phase, sortToken, blockCursor }`: it never embeds the complete occupancy/token plan. On resume Voltra rebuilds that deterministic plan in the pinned generation, uses `sortToken` as an exclusive directional boundary, and applies `blockCursor` only while continuing the same token. Present values are exhausted before the missing-value phase in both directions.
- Direction is part of the original query shape rather than duplicated as mutable cursor state. As with existing structured cursors, callers must not reuse a cursor with a changed query or sort direction.
- With `F` eligible structured fields, one document can contribute to at most `F(F - 1)` cross-field chunk/token pairs before shared-cell deduplication. This cost is accepted because each field already opts into it through `structured: true`; there is no additional range-chunk switch.
- The unified physical table permits one coordinator to combine derived puts/deletes from structured, full-text, relationship, and chunk indexing into DynamoDB `BatchWriteItem` calls of at most 25 operations, with unprocessed-item retries.
- Canonical `docFields` optimistic compare-and-swap remains separate from bulk derived writes. Voltra does not provide multi-index transactions or rollback.
- Obsolete derived term/range rows are removed immediately after the canonical state changes.
- Empty occupancy is removed immediately only when a concurrency-safe proof is available; all other stale cells are reclaimed by a generation rebuild, activation, and retirement cycle.
- An occupancy generation is one version/epoch of the complete occupancy index. It is unrelated to ordinary document revisions or combinatorial permutations.
- Initial migration builds the first generation from canonical `docFields` while queries continue through the exact baseline sort-first traversal.
- A later rebuild creates a separate `building` generation. Writers dual-write the active and building generations while an idempotent canonical backfill and reconciliation complete; queries continue using only the active generation.
- Activation compare-and-swaps the single active-generation pointer. This explicit switch is the only event that invalidates existing occupancy cursors.
- Old-generation query retention is zero. Requests carrying an old-generation cursor return zero results with no next cursor. Physical reclamation may proceed asynchronously after writers stop targeting that generation.
- Occupancy cells remain boolean hints rather than contributor counts. Concurrent count maintenance is unnecessary: unprovably empty cells remain safe false positives until a rebuilt generation omits them.
