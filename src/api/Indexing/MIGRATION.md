# Unified Indexed Query Migration

This alpha release deliberately removes the split search architecture.

## TypeInfo tags

Replace:

| Removed                   | Replacement                              |
| ------------------------- | ---------------------------------------- |
| `@indexed.fullText`       | `@indexed.text`                          |
| `@indexed.structured`     | `@indexed.exact` and/or `@indexed.range` |
| structured array indexing | `@indexed.exact @indexed.membership`     |

`@indexed.decimal` remains available for numeric range occupancy.

## ORM configuration

Replace `indexing.fullText` and `indexing.structured` with:

```ts
indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
  backend: createIndexBackend({
    values: valueBackend,
    valueWriter: valueBackend,
    text: textBackend,
  }),
  tokenizer,
  allowFullScanFallback: true,
});
```

Replace separate field lists/maps with `fieldsByType`. Prefer generation from
TypeInfo tags; use explicit entries only for physical field remapping or
runtime-only capability additions.

## Operators

- String `CONTAINS` is removed. It now means collection membership only.
- Use `LIKE` or `CASE_INSENSITIVE_CONTAINS` for normalized substring matching.
- Use `TEXT_EXACT`, `TEXT_PHRASE`, `TEXT_PREFIX`, or `TEXT_LOSSY` when that
  specific text behavior is intended.

## Public query API

Replace:

- `Where` → `IndexExpression`
- `StructuredSearchOptions` → `IndexSearchOptions`
- `StructuredSearchDependencies` → `IndexBackend`
- `CandidatePage` → `IndexCandidatePage`
- `criteriaToStructuredWhere` → `criteriaToIndexExpression`
- `searchStructured` → `searchIndex`

The old query types/functions are not re-exported or aliased.

## Maintenance and observability

Replace:

- `fullTextIndexFields` → `indexFields`
- `previousFullTextIndexFields` → `previousIndexFields`
- `nextFullTextIndexFields` → `nextIndexFields`
- `onStructuredIndexWrite` → `onIndexWrite`
- routes `fullText`/`structured` → route `indexed` plus plan diagnostics

## Cursors

All previous value-only, exact-text, and lossy-text ORM cursors are invalid.
Restart pagination without a cursor after upgrading.
