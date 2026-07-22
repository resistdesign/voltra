# Voltra Structured Pagination Problem Ledger

Date: 2026-07-22

This ledger preserves the current **Link & Lock** solutions before the physical index layout is reconsidered. It distinguishes working reference implementations from the data-skipping optimization that is designed but not yet materialized.

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

|   # | Known problem                                                                             | Current solution                                                                                                                                                                                                        | Status                                       |
| --: | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
|   1 | A terminal term page emitted a cursor without backend continuation and replayed page one. | Emit continuation only when the backend returns continuation state.                                                                                                                                                     | Implemented in PR #387                       |
|   2 | The `SearchStructured` handler resurrected an exhausted incoming cursor.                  | Return the search result cursor exactly.                                                                                                                                                                                | Implemented in PR #387                       |
|   3 | One `backendToken` cannot represent compound search state.                                | Deterministic positional source-hit cursors.                                                                                                                                                                            | Reference implementation                     |
|   4 | Missing backend state ambiguously meant unstarted or exhausted.                           | Absent positional entry means unstarted; `next: null` means exhausted.                                                                                                                                                  | Reference implementation                     |
|   5 | Partially consumed backend pages require offsets or replay buffers.                       | Consume each internally bounded backend page atomically.                                                                                                                                                                | Reference implementation                     |
|   6 | Generated hits require stable cursor identity.                                            | Regenerate them in stable criterion/hit order and align positionally.                                                                                                                                                   | Reference implementation                     |
|   7 | Atomic work can produce more qualified IDs than the caller page accepts.                  | Store bounded overflow in `readyDocIds`.                                                                                                                                                                                | Reference implementation                     |
|   8 | Compound evaluation discarded child continuation state.                                   | Advance and persist every started source independently.                                                                                                                                                                 | Reference implementation                     |
|   9 | Page-local `AND` intersection misses matches across pages or differently ordered indexes. | Use one candidate source and verify the complete predicate against `docFields`.                                                                                                                                         | Reference implementation                     |
|  10 | Intersection may need to exhaust another index merely to prove false.                     | Candidate-local `docFields` verification proves truth or falsity directly.                                                                                                                                              | Reference implementation                     |
|  11 | `OR` stopped while alternative sources still had pages.                                   | Advance sources deterministically until all are exhausted.                                                                                                                                                              | Reference implementation                     |
|  12 | `OR` duplicates documents emitted by several sources.                                     | First matching source owns the document; later sources verify earlier ownership and skip it.                                                                                                                            | Reference implementation                     |
|  13 | Empty intermediate work was mistaken for exhaustion.                                      | Exhaustion requires no ready IDs and no remaining source.                                                                                                                                                               | Reference implementation                     |
|  14 | Missing records or DAC rejection shrink visible ORM pages.                                | Continue structured search/hydration until the visible page is full or search is exhausted.                                                                                                                             | Reference implementation                     |
|  15 | Broad ORM fallback swallowed cursor and backend failures.                                 | Fall back only for explicit unsupported-plan errors; propagate operational failures.                                                                                                                                    | Reference implementation                     |
|  16 | `sortFields` sorted only hydrated page candidates, not the global result set.             | One required, scalar, structured-indexed sort field selects the native ordered range stream; criteria verify candidates before paging. Unsupported sort shapes fall back to exhaustive compare/sort.                    | Reference implementation                     |
|  17 | Cursor composition state could grow with result history.                                  | Bounded atomic backend pages, bounded ready overflow, and stateless first-source OR ownership.                                                                                                                          | Reference implementation                     |
|  18 | Decimal numeric keys sort lexicographically (`23`, `230`, `34`).                          | TypeInfo number fields use a fixed-width order-preserving IEEE-754 transform; all other fields retain string-oriented key comparison. Normalize `-0`, reject non-finite numbers, and rebuild persisted numeric entries. | Reference implementation; migration required |
|  19 | Sort-first can examine enormous non-matching stretches when criteria are sparse.          | Add a data-skipping layer mapping coarse criterion chunks to blocks of the ordered sort index, then verify exact values inside candidate blocks. Summaries may yield false positives but never false negatives.         | Solved design; physical layout deferred      |

## Range and Sort

`BETWEEN`, `>=`, and `<=` are range-selection operations because ordering makes matching values contiguous and seekable. When sorting by another field, a single index cannot both seek the criterion interval and independently provide the unrelated global order.

The correct baseline is still efficient and exact:

1. Traverse the unrelated sort field's already ordered stream.
2. Verify each range criterion against `docFields`.
3. Stop when the caller page is full.
4. Resume from the same ordered stream cursor.

No full result-set examination is required unless matches are so sparse that filling the page reaches the end. That is a performance distribution problem, not a correctness problem.

## Data-Skipping Optimization

The proposed optimization indexes **ordered-index blocks**, not document IDs:

```text
criterion chunk -> ordered sort-index blocks -> exact candidate IDs
```

Example for `age BETWEEN 23 AND 34 ORDER BY name`:

```text
age chunks 20s + 30s -> name blocks 001, 003, 010
```

Voltra traverses only those name blocks in name order, verifies exact ages, and stops when the page is full. Numeric chunks can be hierarchical magnitude/prefix ranges rather than fixed groups of ten. String chunks can use normalized prefix/token ranges. The required invariant is no false negatives.

This is intentionally not materialized in the current reference PR because the next design phase will decide whether term, range, document, and skipping records can share one physical index table with a deliberately overloaded primary key.

## Numeric Ordering Contract

TypeInfo determines comparison semantics:

- `number` field: store/query an order-preserving numeric encoding and compare numerically.
- every other currently range-capable field: store/query and compare using its string representation.

There is no mixed-type `BETWEEN` ordering contract. Query bounds must conform to the field's TypeInfo type.

## Current Supported Global Sort Shape

- exactly one sort field;
- field is structured-indexed;
- field is scalar and required, so every qualifying item appears in the ordered stream;
- ascending or descending traversal;
- document ID encoded after the value as deterministic tie-breaker.

Multiple sort fields, optional/missing sort values, array/reference fields, and unindexed sort fields use the exhaustive fallback until a provably correct ordered plan exists.

## Regression Obligations

- Leaf term/range pagination through exhaustion and a request after the terminal page.
- Positional continuation for compound criteria and generated `IN`/`LIKE` hits.
- Atomic backend pages with bounded ready overflow.
- `AND` across pages and mixed index orders.
- `OR` exhaustion without duplicates.
- Visible-page filling through missing records and DAC rejection.
- Invalid cursors and backend failures propagate.
- Global ascending/descending sort pages with criteria on another field.
- Numeric ordering across sign, digit length, decimal values, zero/negative-zero, and inclusive boundaries.
- Cursor size remains bounded by one backend work unit, not result history.

## Count

- **19 known correctness/performance obligations**
- **2 implemented in PR #387**
- **16 implemented in the Link & Lock reference implementation**
- **1 solved design intentionally deferred:** data-skipping block materialization (#19)

All 19 now have a concrete solution. The next open problem is physical representation: whether these records and traversals can be expressed cleanly with **one index table** and a deliberately overloaded primary key.
