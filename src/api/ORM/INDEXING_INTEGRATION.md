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
- Paging: `itemsPerPage` and `cursor` are passed to the driver. The DynamoDB driver uses `Scan` and returns a JSON-serialized `LastEvaluatedKey` as the cursor.
- Sorting: `sortFields` is applied in-memory in the DynamoDB driver after list results are loaded.
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
