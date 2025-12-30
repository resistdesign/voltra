# ORM Indexing Integration: Behavior Contract

This document captures current ORM list/search and relationship behaviors that must be preserved (or explicitly changed) when wiring Indexing as the primary engine.

## List/Search (ListItemsConfig)

- Inputs: `ListItemsConfig` supports `criteria` (AND/OR of `FieldCriterion`), `sortFields`, `itemsPerPage`, `cursor`, and optional `selectedFields`.
- Validation: `validateSearchFields` enforces that criteria field names exist in the type info map.
- Operators: the ORM expects the following comparison operators to be supported by the underlying list engine:
  - `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `GREATER_THAN_OR_EQUAL`, `LESS_THAN`, `LESS_THAN_OR_EQUAL`, `IN`, `NOT_IN`, `LIKE`, `NOT_LIKE`, `EXISTS`, `NOT_EXISTS`, `IS_NOT_EMPTY`, `IS_EMPTY`, `BETWEEN`, `NOT_BETWEEN`, `CONTAINS`, `NOT_CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `DOES_NOT_START_WITH`, `DOES_NOT_END_WITH`.
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
