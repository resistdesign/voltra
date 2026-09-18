# Fix Compound Indexed Query Planning

## Goal

Make compound indexed value queries use the indexes Voltra already records instead of
walking one candidate stream and performing serialized canonical document reads for
the remaining predicates.

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

- [ ] Route compound value-only Boolean expressions through indexed child execution
      and candidate intersection/union instead of structured compound document
      verification.
- [ ] Ensure global ordering is applied after candidate composition without changing
      result ordering or cursor semantics.
- [ ] Preserve single-leaf structured ordered traversal and occupancy behavior.
- [ ] Add regression coverage proving exact + range AND does not require canonical
      document verification reads.
- [ ] Add regression coverage for ordered exact + range queries with LIMIT 1 and
      pagination.
- [ ] Re-run existing mixed AND/OR, ordering, stale-cursor, budget, structured-search,
      and ORM/indexing coverage.
- [ ] Run `yarn test` and `yarn build`.
- [ ] Open a PR documenting that index storage/write behavior is unchanged.
