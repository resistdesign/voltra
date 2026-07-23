# Voltra Structured Pagination Problem Ledger

Date: 2026-07-22

This ledger preserves the current **Link & Lock** solutions while the physical index layout is implemented. It distinguishes working reference implementations from the required data-skipping subsystem now tracked in `planning/feat-link-and-lock-chunk-skipping.md`.

## Current Execution Model

1. Regenerate candidate sources deterministically from criterion and generated-hit order.
2. If global sorting is requested, the sort field's ordered range partition becomes the candidate stream.
3. Otherwise, `AND` uses one deterministic candidate source and `OR` advances deterministic alternative sources.
4. Consume a bounded backend page completely before checkpointing its continuation.
5. Verify compound predicates against canonical structured `docFields`.
6. Return qualified IDs until the caller page is full; keep only bounded overflow in `readyDocIds`.
7. Resume from the ordered source cursor on the next request.

The sort-first rule is:

> Traverse the already ordered sort-field stream; ask criteria questions as candidates pass by.

This produces globally correct pages and can stop as soon as a page is full. Its worst case remains sparse compliance: if the first and millionth ordered candidates match, Voltra must examine that interval.

## Cursor Contract

```ts
type StructuredSearchCursorState = {
  hits: Array<{
    next: string | null; // null means exhausted
  }>;
  sourceIndex: number;
  readyDocIds: DocId[];
};
```

- The positional `hits` prefix contains only sources that have started or completed; later sources are unstarted.
- No criterion path, hit path, fingerprint, version, or index discriminator is required.
- Cursor reuse with different criteria, order, mapping, tokenizer, or sort configuration is invalid API usage.
- `readyDocIds` contains only overflow from bounded atomic backend work; it does not grow with result history.

## Problem/Solution Table

|   # | Known problem                                                                             | Current solution                                                                                                                                                                                                           | Status                                       |
| --: | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
|   1 | A terminal term page emitted a cursor without backend continuation and replayed page one. | Emit continuation only when the backend returns continuation state.                                                                                                                                                        | Implemented in PR #387                       |
|   2 | The `SearchStructured` handler resurrected an exhausted incoming cursor.                  | Return the search result cursor exactly.                                                                                                                                                                                   | Implemented in PR #387                       |
|   3 | One `backendToken` cannot represent compound search state.                                | Deterministic positional source-hit cursors.                                                                                                                                                                               | Reference implementation                     |
|   4 | Missing backend state ambiguously meant unstarted or exhausted.                           | Absent positional entry means unstarted; `next: null` means exhausted.                                                                                                                                                     | Reference implementation                     |
|   5 | Partially consumed backend pages require offsets or replay buffers.                       | Consume each internally bounded backend page atomically.                                                                                                                                                                   | Reference implementation                     |
|   6 | Generated hits require stable cursor identity.                                            | Regenerate them in stable criterion/hit order and align positionally.                                                                                                                                                      | Reference implementation                     |
|   7 | Atomic work can produce more qualified IDs than the caller page accepts.                  | Store bounded overflow in `readyDocIds`.                                                                                                                                                                                   | Reference implementation                     |
|   8 | Compound evaluation discarded child continuation state.                                   | Advance and persist every started source independently.                                                                                                                                                                    | Reference implementation                     |
|   9 | Page-local `AND` intersection misses matches across pages or differently ordered indexes. | Use one candidate source and verify the complete predicate against `docFields`.                                                                                                                                            | Reference implementation                     |
|  10 | Intersection may need to exhaust another index merely to prove false.                     | Candidate-local `docFields` verification proves truth or falsity directly.                                                                                                                                                 | Reference implementation                     |
|  11 | `OR` stopped while alternative sources still had pages.                                   | Advance sources deterministically until all are exhausted.                                                                                                                                                                 | Reference implementation                     |
|  12 | `OR` duplicates documents emitted by several sources.                                     | First matching source owns the document; later sources verify earlier ownership and skip it.                                                                                                                               | Reference implementation                     |
|  13 | Empty intermediate work was mistaken for exhaustion.                                      | Exhaustion requires no ready IDs and no remaining source.                                                                                                                                                                  | Reference implementation                     |
|  14 | Missing records or DAC rejection shrink visible ORM pages.                                | Continue structured search/hydration until the visible page is full or search is exhausted.                                                                                                                                | Reference implementation                     |
|  15 | Broad ORM fallback swallowed cursor and backend failures.                                 | Fall back only for explicit unsupported-plan errors; propagate operational failures.                                                                                                                                       | Reference implementation                     |
|  16 | `sortFields` sorted only hydrated page candidates, not the global result set.             | One scalar, structured-indexed sort field selects the native ordered range stream; criteria verify candidates before paging. Optional fields use a deterministic missing-value stream so missing documents remain visible. | Implemented                                  |
|  17 | Cursor composition state could grow with result history.                                  | Bounded atomic backend pages, bounded ready overflow, and stateless first-source OR ownership.                                                                                                                             | Reference implementation                     |
|  18 | Decimal numeric keys sort lexicographically (`23`, `230`, `34`).                          | TypeInfo number fields use a fixed-width order-preserving IEEE-754 transform; all other fields retain string-oriented key comparison. Normalize `-0`, reject non-finite numbers, and rebuild persisted numeric entries.    | Reference implementation; migration required |
|  19 | Sort-first can examine enormous non-matching stretches when criteria are sparse.          | Map criterion chunks to immutable value-space blocks of the ordered sort index, traverse only occupied blocks, and verify exact values inside them. Occupancy may yield false positives but never false negatives.         | Implemented                                  |

## Range and Sort

`BETWEEN`, `>=`, and `<=` are range-selection operations because ordering makes matching values contiguous and seekable. When sorting by another field, a single index cannot both seek the criterion interval and independently provide the unrelated global order.

The baseline remains exact but can be prohibitively expensive:

1. Traverse the unrelated sort field's already ordered stream.
2. Verify each range criterion against `docFields`.
3. Stop when the caller page is full.
4. Resume from the same ordered stream cursor.

Sparse matches can force Voltra to examine most or all of the ordered index stream merely to fill one visible page. Chunk skipping is therefore required for practical large-index operation, not an optional micro-optimization.

## Data-Skipping Subsystem

The data-skipping subsystem indexes **criterion chunks to exact tokens in an existing ordered index**, not document IDs:

```text
criterion chunk -> occupied exact sort tokens -> existing sort-index rows -> exact verification
```

Example for `age BETWEEN 23 AND 34 ORDER BY name`:

```text
age chunks [20, 30) + [30, 40) -> encoded name tokens for "Alice", "Mary", "Zoe"
```

An occupancy cell such as `(age, [20, 30), name, token("Zoe"))` contains no document pointer. It states that at least one item in that age chunk has the exact persisted name sort token. Voltra orders the occupied tokens, seeks directly to each token's rows in the existing name range index, obtains document IDs there, verifies exact ages from canonical `docFields`, and stops when the page is full. A broader second layer of name blocks is unnecessary.

For item `123` with `age: 23` and `name: "Zoe"`, the conceptual chain is:

```text
age 23 -> age chunk [20, 30) -> encoded name token "Zoe" -> name range row -> item 123 -> verify exact age
```

For `age BETWEEN 23 AND 34 ORDER BY name`, both edge chunks are consulted, but canonical verification rejects values below `23` or above `34`.

This is materialized as occupancy, missing-value, and generation record families in the unified index table. Criterion chunks and exact sort tokens are stable value-derived identities, never positional pages. Obsolete real index rows are removed during successful updates/deletes. Boolean occupancy cells remain safe false positives until a generation rebuild and retirement safely reclaim them; they can increase reads but cannot hide a match.

### Compound criteria and sparse range reads

Occupancy cells are range-queryable by encoded criterion chunk beneath a partition identity containing the occupancy generation, type, criterion field, and sort field. A broad range therefore performs sparse backend range reads and returns only cells that exist; Voltra never synthesizes every possible chunk key. The cost of `age BETWEEN 0 AND 99999999999` depends on the occupancy metadata actually present in that range, not ten billion hypothetical decade chunks.

Each criterion leaf yields its occupied exact sort-token set. Nested criteria compose those sets structurally:

- `OR` unions child token sets;
- `AND` intersects child token sets;
- repeated tokens are deduplicated;
- the resulting tokens are globally ordered before their existing sort-index rows are traversed.

This composition is intentionally coarse: two different documents may cause the same sort token to appear in two child sets. It may therefore admit false-positive blocks, but cannot exclude a token containing a completed-write match. Voltra verifies the full original predicate against canonical `docFields` for every candidate.

Planning is bounded by an internal budget on actual occupancy cells read plus a backend-page guard. The limit is an implementation constant tuned by scale tests, not TypeInfo or query configuration. Voltra emits no results until the token plan is complete. If the budget is crossed, the partial plan is discarded and the query restarts with the exact baseline sort-first traversal. The theoretical width of the criterion range is not itself a fallback trigger.

### Ordered skipping cursor

The block-aware cursor stores only the state needed to resume the ordered stream:

```ts
{
  generation,
  phase: "present" | "missing",
  sortToken,
  blockCursor,
}
```

`generation` identifies the occupancy build used to create the cursor. It remains valid only while that generation is active. `sortToken` is an exclusive directional resume boundary, and `blockCursor` is the backend continuation used only while the same exact token is still being consumed. The cursor never stores the complete token set.

The original unchanged query supplies traversal direction: ascending resumes toward higher tokens and descending toward lower tokens. If optimistic mutation removed the boundary token between pages, Voltra seeks from its encoded boundary and continues; the token need not still exist. Present values are traversed in the requested direction, followed by the deterministic missing-value phase in both directions. Reusing an opaque cursor with different criteria or direction remains invalid.

Normal document creates, updates, and deletes mutate the active occupancy generation in place and do not invalidate cursors. Only an explicit occupancy rebuild or schema migration changes the active generation. A cursor naming any non-active generation is stale and deterministically returns zero results with no successor cursor.

### Occupancy generation lifecycle

An occupancy generation is a version/epoch of the complete occupancy index, not a document revision or a set of permutations.

1. Create a new generation in `building` state while queries continue using the current active generation. If no active generation exists during initial migration, queries use the exact baseline sort-first traversal.
2. While the rebuild runs, document mutations write occupancy into both the active and building generations. The existing optimistic retry/repair contract applies; no transactional cutover or rollback is introduced.
3. Backfill the building generation idempotently from canonical `docFields`, then reconcile mutations and incomplete derived writes before activation.
4. Atomically compare-and-swap the single active-generation pointer to the completed generation. Only this explicit switch invalidates cursors from the prior generation.
5. Stop writing the prior generation and reclaim its records asynchronously. Its query retention is zero: requests carrying its cursors return zero results and no next cursor even if physical deletion has not finished.

Occupancy cells remain boolean existence hints. They do not maintain contributor counts, because optimistic concurrent increments/decrements would add correctness risk without improving query truth. Cells that cannot be proven empty remain safe false positives until the next generation rebuild omits them.

## Unified Key Safety

Every physical key is produced by one versioned codec from structural identity segments; callers never concatenate or parse raw type, field, token, relationship, value, or document identities.

- Record-family namespace constants isolate structured, full-text, relationship, and occupancy records.
- URI-component encoding protects identity segments containing delimiters such as `#`, `%`, `/`, and `?`.
- Sortable range values use dedicated order-preserving codecs instead of URI encoding.
- Document/entity identities carry scalar type tags, so numeric `123` and string `"123"` cannot collide. The codec, document-owned partitions, posting/range sort keys, S3 exact keys, in-memory membership keys, and cursors now preserve that distinction.
- A collision requires the same complete encoded `pk` and `sk`, not merely a repeated segment.

The chunk-skipping subsystem reuses this codec and adds isolated occupancy, missing-value, and generation namespaces.

## Implemented Cleanup Guarantees

- Structured updates compare-and-swap canonical fields, then delete obsolete term/range rows and write their replacements.
- Full-text updates diff the prior document mirror, delete obsolete lossy/exact/membership/position rows, update statistics, and write the new mirror.
- Unified-table delete requests contain exactly the physical `pk` and `sk`; the Dynamo-shaped in-memory client rejects malformed keys.
- Shared-map regressions prove stale structured and full-text rows disappear after an update.
- Occupancy cells remain safe false positives during ordinary mutation; generation rebuild/retirement omits and physically reclaims stale cells without contributor counts.

## Numeric Ordering Contract

TypeInfo determines comparison semantics:

- `number` field: store/query an order-preserving numeric encoding and compare numerically.
- every other currently range-capable field: store/query and compare using its string representation.

There is no mixed-type `BETWEEN` ordering contract. Query bounds must conform to the field's single TypeInfo comparison type.

All scalar, non-reference `string` and `number` fields marked `tags.indexed.structured` automatically participate as criterion and sort axes. There is no additional range-chunk opt-in, opt-out, or explicit field-pair configuration. Arrays and booleans do not participate.

A string field may also be marked for full-text indexing; that does not change its structural range behavior. The one-type-per-field rule remains authoritative, including literal unions: Voltra does not define a mixed string/number ordering.

String criterion quantization is fixed and derived from the exact structured sortable value:

- use the first **up to three Unicode code points**, preserving case;
- `"K" -> exact("K")` and `"Ki" -> exact("Ki")`;
- `"Kim"` and `"Kimberly" -> prefix("Kim")`;
- `"kimberly" -> prefix("kim")`, distinct from `prefix("Kim")`;
- the empty string uses an exact empty-value bucket.

A three-code-point prefix bucket denotes the contiguous lexicographic interval containing values with that prefix. Exact short-value buckets are distinct from prefix intervals, and the versioned order-preserving codec operates on Unicode code points rather than splitting UTF-16 surrogate pairs. This is structural range metadata: it does not lowercase values or inherit token sizes from full-text or structured `LIKE`. Existing case-insensitive indexed search and case-sensitive `LIKE` fallback behavior remain separate and unchanged.

Numeric criterion quantization is derived from TypeInfo:

```ts
tags: {
  indexed: {
    structured: true,
    decimal: true,
  },
}
```

- ordinary `number`: decade chunk, e.g. `23 -> [20, 30)`;
- `decimal: true`: unit chunk, e.g. `22.4549126 -> [22, 23)`.

Many distinct decimal values inside the same criterion chunk and sort token share one occupancy cell. Cardinality depends on occupied criterion-chunk/sort-token pairs, not on the number of distinct decimal values alone.

With `F` eligible structured fields, one document contributes to at most `F(F - 1)` cross-field criterion-chunk/sort-token pairs before shared-cell deduplication. Same-field range-and-sort queries need no cell because the criterion's ordered stream already provides both filtering and order. This write/storage amplification is deliberately governed by the existing per-field `structured: true` opt-in rather than a second chunk-index flag.

## Current Supported Global Sort Shape

- exactly one sort field;
- field is structured-indexed;
- field is scalar; present values appear in the ordinary ordered stream and missing optional values use a deterministic missing-value stream after present values;
- ascending or descending traversal;
- document ID encoded after the value as deterministic tie-breaker.

Multiple sort fields, array/reference fields, and unindexed sort fields use the exhaustive fallback. Optional/missing sort values use the generation-pinned missing stream after present values. Before initial activation or when an optional skip plan is unavailable, ORM routing uses exhaustive full-scan comparison so they are never omitted.

## Optimistic Mutation Contract

Voltra intentionally does not provide transactions or rollback across index families.

1. Calculate the complete forward delta for canonical fields plus structured, full-text, relationship, range-chunk, and cleanup records.
2. Use the existing conditional `docFields` version swap for optimistic concurrency; retry from fresh canonical state on a version mismatch.
3. Apply derived puts/deletes forward and retry DynamoDB unprocessed items; do not undo already-applied writes when a later write fails.
4. Remove obsolete real index rows during successful updates/deletes. Exact canonical-field verification rejects stale rows whose indexed criteria no longer match; repair/reindex and occupancy compaction converge residual derived state.

The unified table enables a single higher-level coordinator to combine compatible derived mutations across index families into `BatchWriteItem` requests of at most 25 operations. Conditional canonical writes remain separate. This reduces calls and improves throughput without pretending the batches are atomic.

## Regression Obligations

- Leaf term/range pagination through exhaustion and a request after the terminal page.
- Positional continuation for compound criteria and generated `IN`/`LIKE` hits.
- Atomic backend pages with bounded ready overflow.
- `AND` across pages and mixed index orders.
- `OR` exhaustion without duplicates.
- Visible-page filling through missing records and DAC rejection.
- Invalid cursors and backend failures propagate.
- Global ascending/descending sort pages with criteria on another field.
- Multi-page skipping across exact-token ties, removed boundary tokens, the present-to-missing transition, and both traversal directions.
- Active-generation rebuilds, live dual-writing/backfill, activation, stale-generation cursor termination, and asynchronous old-generation reclamation.
- Numeric ordering across sign, digit length, decimal values, zero/negative-zero, and inclusive boundaries.
- Cursor size remains bounded by one backend work unit, not result history.

## Count

- **19 known correctness/performance obligations**
- **2 implemented in PR #387**
- **17 implemented in Link & Lock**, including the completed data-skipping subsystem (#19)

All 19 are implemented. The physical representation is one index table with versioned, namespaced key families; sparse criteria can now skip enormous unrelated-sort stretches without sacrificing canonical verification.
