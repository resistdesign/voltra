# First-Class Indexing

## Goals:

### 1. Officially Supported Indexing Field Tags

A. `SupportedFieldTags` to support `indexed` settings:

- `structured: boolean`: Signifies that this field should be structurally indexed.
- `fullText: boolean`: Signifies that this field should be full-text indexed.

B. A utility function to generate a `TypeInfoORMIndexingConfig` based in the field indexing tags (from
`SupportedFieldTags`) in a `TypeInfoMap`.

- Looks at all fields of all types in the map and configures the `fullText` and `structured` properties of a
  `TypeInfoORMIndexingConfig`.

### 2. Manual Indexing and Index Maintenance

When `TypeInfo`, `TypeInfoField` or `TypeInfoMap` definitions change, or data is modified outside of a `TypeInfoORM`/
`TypeInfoORMService`, the indexes will need to be reconciled.

Utilities that support all necessary indexing/reindexing/clean-up/etc operations will need to be
created/tested/documented/etc and given samples/examples.
