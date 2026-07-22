# ORM Indexing Integration: Behavior Contract

This document captures current ORM list/search and relationship behaviors that must be preserved (or explicitly changed) when wiring Indexing as the primary engine.

## List/Search (ListItemsConfig)

- Inputs: `ListItemsConfig` supports `criteria` (AND/OR of `FieldCriterion`), `sortFields`, `itemsPerPage`, `cursor`, and optional `selectedFields`.
- Validation: `validateSearchFields` enforces that criteria field names exist in the type info map.
- Execution path selection:
  - Auto fulltext path: used when criteria contains exactly one fulltext-indexed field criterion and the operator is fulltext-compatible (`LIKE`, `CONTAINS`, `STARTS_WITH`).
  - Structured indexed path: used only when all criteria fields are explicitly listed in `indexing.structured.indexedFieldsByType[typeName]` and every criterion's field type/operator pair is supported by structured indexing.
  - Full scan + compare fallback: used when indexed paths are unavailable or unsupported for a given operator/combination.
- Structured field inclusion:
  - Structured indexing is opt-in by field via `indexing.structured.indexedFieldsByType`.
  - Fields not included in `indexedFieldsByType` are excluded from structured index writes and structured query routing.
  - Excluded/unsupported criteria automatically use full scan + compare fallback.
- Structured tokenizer config:
  - `indexing.structured.tokenizer` configures structured string token generation used for contains/LIKE behavior.
  - Supported keys: `minNgramSize`, `maxNgramSize`, `maxIndexedStringLength`, `maxTokensPerValue`.
  - Safe defaults preserve current behavior (`1..3` ngrams, length `128`, max tokens `256`).
- Structured write concurrency hardening:
  - Structured DDB writes use optimistic compare-and-swap on `docFields` version state before applying term/range diffs.
  - On version mismatch, writer retries using fresh state to prevent stale diff application under concurrent writes.
- Structured compound paging:
  - Candidate sources are regenerated deterministically and resumed by positional source cursor.
  - Backend pages are internally bounded and consumed atomically; qualified overflow is retained in the structured cursor.
  - `AND` uses one candidate stream and verifies the complete predicate against canonical `docFields`.
  - `OR` assigns each result to its first matching source, preventing cross-source duplicates without an unbounded seen set.
  - ORM hydration continues until the requested visible page is full or structured candidates are exhausted.
  - Invalid cursors and backend failures propagate; only explicit unsupported-plan errors use full scan + compare.
- Structured observability:
  - `indexing.observability.onListRoutingDecision` can capture list routing decisions (`fullText`, `structured`, `fullScanCompare`) and reasons, without affecting runtime behavior.
  - `indexing.observability.onStructuredIndexWrite` can capture structured upsert/remove events and indexed field counts.
- Tokenizer correctness expectations for structured `LIKE`/`contains`:
  - Current structured string tokenization uses normalized unique 1/2/3-grams with bounded token count.
  - This preserves short-substring matching behavior for indexed string fields.
  - More aggressive token reduction strategies must be evaluated against correctness requirements before adoption.
- Operators: the ORM expects the following comparison operators to be supported by the underlying list engine:
  - `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `GREATER_THAN_OR_EQUAL`, `LESS_THAN`, `LESS_THAN_OR_EQUAL`, `IN`, `NOT_IN`, `LIKE`, `NOT_LIKE`, `EXISTS`, `NOT_EXISTS`, `IS_NOT_EMPTY`, `IS_EMPTY`, `BETWEEN`, `NOT_BETWEEN`, `CONTAINS`, `NOT_CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `DOES_NOT_START_WITH`, `DOES_NOT_END_WITH`.
- Fulltext semantics:
  - `EQUALS` is structural exact equality and is intentionally not treated as fulltext.
  - Fulltext routing is criteria-driven; `list` does not accept a separate fulltext argument.
- Manual index maintenance:
  - `indexItemIndexes` writes a supplied snapshot into the currently configured fulltext/structured indexes.
  - `removeItemIndexes` removes a supplied snapshot from the current indexes and is the explicit cleanup path for out-of-band deletes.
  - `replaceItemIndexes` removes one snapshot and indexes another, allowing old and new fulltext field sets to differ.
  - `reindexStoredItem` refreshes a single current driver item without duplicating postings; when out-of-band writes changed indexed values, provide `previousItem`, and when schema/config changes removed old fulltext fields, provide `previousFullTextIndexFields`.
  - `reindexStoredType` pages through the current driver items and reapplies indexing for each item; provide `previousItemsByPrimaryField` for out-of-band updates that changed indexed values, and deleted items still require explicit `removeItemIndexes` cleanup because fulltext removal needs prior field values.
  - Structured cleanup can reconcile from the stored doc id, but fulltext cleanup cannot infer removed tokens for deleted/retagged fields without a prior snapshot or prior field list.
- Paging: `itemsPerPage` and `cursor` are passed to the driver. The DynamoDB driver returns a JSON-serialized `LastEvaluatedKey` as the cursor for either `Scan` or GSI-backed `Query` requests.
- Sorting:
  - On the structured path, one required scalar indexed sort field selects that field's globally ordered range stream before criteria verification.
  - Structured sorting can traverse forward or backward and resumes from that ordered stream's cursor.
  - Multiple, optional, array/reference, or unindexed structured sort fields use full scan + compare rather than page-local sorting.
  - Numeric range/sort keys use a fixed-width order-preserving encoding and require reindexing when upgrading from decimal string keys.
  - Without `sortFields`, the DynamoDB driver uses `Scan`.
  - With `sortFields`, the DynamoDB driver defaults to `Scan` plus in-memory sorting.
  - When `dbSpecificConfig.useFirstSortFieldAsIndexName` is `true`, the driver uses only the first sort field to build a DynamoDB `Query`.
  - In that opt-in query mode, the first sort field's `field` value is treated as the DynamoDB `IndexName`.
  - In that opt-in query mode, the list `criteria` is reused as the `KeyConditionExpression` input for the `Query`.
  - In that opt-in query mode, the first sort field's `reverse` flag maps to `ScanIndexForward = false`.
  - Additional sort fields are ignored only in the opt-in query mode; the in-memory fallback honors the provided sort fields.
  - Invalid criteria/index combinations are allowed to fail at DynamoDB runtime; the driver does not infer or validate GSI key schema.
- Selected fields: `selectedFields` is sanitized to always include the primary field; when DAC is enabled, reads ignore `selectedFields` at the driver level and are filtered after DAC validation.

## Relationships

- Relationship item shape: `BaseItemRelationshipInfo` with fields:
  - `fromTypeName`, `fromTypeFieldName`, `fromTypePrimaryFieldValue`, `toTypePrimaryFieldValue`.
- `createRelationship`:
  - Validates relationship structure and type reference for the `fromTypeFieldName`.
  - If the relationship field is `array: true`, always creates a new relationship item.
  - If the field is not an array, checks for an existing relationship with matching `fromTypeName` + `fromTypeFieldName`. If one exists, it is updated (overwritten) to point to the new destination; otherwise a new item is created.
- `deleteRelationship`:
  - Lists relationships by `fromTypeName`, `fromTypePrimaryFieldValue`, `fromTypeFieldName`, and `toTypePrimaryFieldValue`, then deletes all matching items. Returns `remainingItemsExist` based on cursor.
- `listRelationships`:
  - Lists relationships by `fromTypeName`, `fromTypeFieldName`, and `fromTypePrimaryFieldValue`.
  - If DAC is enabled, filters out relationship items that fail DAC validation.
- `listRelatedItems`:
  - Calls `listRelationships`, then reads each `toTypePrimaryFieldValue` from the related type via `read`.
  - Returns the related items in the same order as relationships are returned.

## DAC considerations

- DAC validation is applied after read/list; when enabled, the driver is asked for full items to ensure access checks have required fields.
- List filtering under DAC happens in memory.
