# Fix Compound Indexed Query Planning

## Goal

Make compound indexed value queries choose a selective indexed candidate stream,
avoid order-by forcing a broad global range traversal, and batch the structured
document reads needed to verify the remaining predicates.

The motivating production shape is an exact-plus-range conjunction such as:

```text
userId == X
AND dateCreated >= Y
ORDER BY dateCreated DESC
LIMIT 1
```

This must remain a normal ORM/index query. Consumers must not need application-specific
compound indexes or direct DynamoDB queries.

## Constraints

- Do not change physical index record formats, index-writing behavior, TypeInfo index
  annotations, or DynamoDB table schemas.
- Do not require reindexing or migration of existing data.
- Do not change the public ORM criteria, ordering, pagination, cursor, or DAC contracts.
- Preserve exact, range, membership, text, mixed value/text, AND, OR, occupancy,
  optional-ordering, and canonical-verification semantics.
- Preserve query budgets, deterministic fingerprints, stale-cursor protection, and
  explicit budget failures.
- Keep the change isolated to query planning/execution unless a lower-level change is
  proven necessary.
- Do not add unbounded execution loops.

## Checklist

- [x] Prefer an exact-term index source when the existing structured AND driver would
      otherwise be an open-ended range, avoiding broad exact + range traversal without
      disturbing term or bounded-range plans.
- [x] Keep global ordering at the unified query layer for compound expressions so
      order-by does not override the selective structured driver.
- [x] Batch structured document verification reads with an optional backend bulk-read
      capability and bounded DynamoDB BatchGet retries.
- [x] Preserve single-leaf structured ordered traversal and occupancy behavior.
- [x] Add regression coverage proving exact + range AND uses the exact-term source and
      one batched verification read.
- [x] Add regression coverage for ordered exact + range queries with LIMIT 1 and
      pagination.
- [ ] Re-run existing mixed AND/OR, ordering, stale-cursor, budget, structured-search,
      and ORM/indexing coverage.
- [ ] Run `yarn test` and `yarn build`.
- [ ] Open a PR documenting that index storage/write behavior is unchanged.
