# Indexed Query Architecture

Voltra exposes one logical indexed-query engine. A query may combine exact
terms, collection membership, ranges, normalized text, exact phrases, prefixes,
and lossy text in the same `AND`/`OR` expression.

The storage mechanisms remain specialized:

- Value records provide exact terms, membership, ranges, ordered traversal,
  optional-value handling, and Link & Lock occupancy.
- Text records provide lossy postings, exact token positions, per-document
  membership, statistics, and document mirrors.
- The query engine combines their candidate sets, owns logical pagination and
  ordering, and tells the ORM when canonical verification is required.

One logical query may therefore issue several DynamoDB `Query` operations. The
engine, rather than DynamoDB, applies the Boolean expression.

## TypeInfo capabilities

Indexing is declared semantically:

```ts
type Article = {
  /** @primaryField */
  id: string;

  /** @indexed.exact @indexed.range */
  state: string;

  /** @indexed.exact @indexed.range @indexed.decimal */
  score: number;

  /** @indexed.text */
  title: string;

  /** @indexed.exact @indexed.membership */
  tags: string[];
};
```

`getTypeInfoORMIndexingConfigFromTypeInfoMap` derives one `fieldsByType`
capability registry. It is the source of truth for compilation, mutation,
ordering, and occupancy.

Text fields enable these semantic modes:

- `caseInsensitiveEquals`
- `caseInsensitiveContains`
- `exact`
- `phrase`
- `prefix`
- `lossy`

Unicode text is normalized consistently for canonical comparison. Case is
folded, diacritics are removed, and punctuation/separator runs are treated as
spaces.

## Backend composition

Compose specialized implementations structurally:

```ts
const backend = createIndexBackend({
  values: valueBackend,
  valueWriter: valueBackend,
  text: textBackend,
});

const indexing = getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
  backend,
  tokenizer,
  limits: {
    maxTextTokens: 12,
    maxCandidates: 5_000,
  },
  allowFullScanFallback: true,
});
```

`values` may be a DynamoDB reader or the in-memory reference backend. `text`
may likewise be backed by DynamoDB or memory. Query composition, cursor
identity, budgets, and verification are shared.

## Semantic criteria

Public criteria describe behavior rather than selecting a backend:

```ts
const criteria = {
  logicalOperator: LogicalOperators.AND,
  fieldCriteria: [
    {
      fieldName: "state",
      operator: ComparisonOperators.IN,
      valueOptions: ["published", "reviewed"],
    },
    {
      fieldName: "score",
      operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
      value: 80,
    },
    {
      fieldName: "title",
      operator: ComparisonOperators.TEXT_PHRASE,
      value: "distributed runtime",
    },
  ],
};
```

Important operator contracts:

- `EQUALS` is canonical scalar equality.
- `CONTAINS` is collection membership only.
- `LIKE` and `CASE_INSENSITIVE_CONTAINS` are normalized substring matching.
- `CASE_INSENSITIVE_EQUALS` is normalized full-value equality.
- `TEXT_EXACT`, `TEXT_PHRASE`, `TEXT_PREFIX`, and `TEXT_LOSSY` make text intent
  explicit.
- `IN` is an equality disjunction.
- `BETWEEN`, `GREATER_THAN_OR_EQUAL`, and `LESS_THAN_OR_EQUAL` use ordered
  range capabilities.

Unindexed or unsupported criteria use canonical scan-and-compare only when
`allowFullScanFallback` is enabled.

## Canonical verification and page refill

Exact value indexes normally produce exact candidate sets. Text, normalized,
tokenized, and lossy indexes can produce supersets. `searchIndex` propagates
`requiresCanonicalVerification`; the ORM then evaluates the original criteria
against the canonical record before it counts toward the page.

The ORM continues consuming indexed pages after:

- a stale index entry,
- a deleted canonical record,
- an approximate candidate mismatch, or
- DAC rejection.

It stops when the requested page is full, the plan is exhausted, or a declared
budget is exceeded.

## Cursors

The public cursor is a versioned envelope for the complete logical query. It
contains query and plan fingerprints plus a bounded continuation offset.
Fingerprint identity includes:

- the expression,
- requested ordering,
- tokenizer configuration,
- field capabilities,
- occupancy generation, and
- planner version.

Old value-only, exact-text, and lossy-text cursors are not accepted by the
unified operation. A changed query or plan raises a stale-cursor error.

## Ordering and occupancy

Ordering is global. The engine either produces the complete ordered candidate
set or throws `INDEX_QUERY_UNSUPPORTED_ORDER`; it never sorts only one returned
page and presents that as global order.

Link & Lock occupancy remains a value-driver optimization. In mixed `AND`
plans, an occupancy-aware ordered value stream can drive while text leaves
filter its candidates. Without an explicit order, a selective text leaf may be
the diagnostic driver while value leaves filter its candidates.

## Budgets and diagnostics

Limits cover expression depth, leaf count, `OR` fan-out, text tokens, backend
pages, candidates, and cursor bytes. Exceeding a budget raises
`INDEX_QUERY_BUDGET_EXCEEDED`; partial logical results are never returned.

Routing observability reports only:

- `indexed`
- `fullScanCompare`
- `canonicalDriverList`

Indexed diagnostics separately describe expression kinds, driver kind,
intersection/union strategy, verification, pages, and candidates examined.

See [MIGRATION.md](./MIGRATION.md) for the alpha breaking changes.
