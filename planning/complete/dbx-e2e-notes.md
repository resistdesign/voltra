# DBX E2E Notes (Phase 0 Inventory)

## JSON Spec Runner Contract
- Entry: `src/common/Testing/CLI.ts` (CLI name "vest" in usage output).
- Spec file shape: `TestConfig` in `src/common/Testing/Types.ts`:
  - `file`: module path (relative to spec) containing test exports.
  - `tests`: array of tests with `export`, `conditions`, optional `setup`, `operation`, `expectation`.
- Execution flow: `executeTestingCommand` → `runTestsForFile` / `generateTestsForFile` in `src/common/Testing/Utils.ts`.
  - `conditions` can be inline array or `{ file, export }` to load from module.
  - `setup` can call or instantiate exported setup before running test.

## Router / API Entry Points
- Cloud function router: `handleCloudFunctionEvent` in `src/api/Router/index.ts`.
- AWS normalization: `AWS.normalizeCloudFunctionEvent` in `src/api/Router/AWS.ts`.
- ORM route map entrypoint: `getTypeInfoORMRouteMap` in `src/api/ORM/ORMRouteMap.ts`.

## In-Memory DB Drivers
- Data items: `InMemoryDataItemDBDriver` in `src/api/ORM/drivers/InMemoryDataItemDBDriver.ts`.
- Relationships: `InMemoryItemRelationshipDBDriver` in `src/api/ORM/drivers/InMemoryItemRelationshipDBDriver.ts`.
- Files (if needed): `InMemoryFileItemDBDriver` in `src/api/ORM/drivers/InMemoryFileItemDBDriver.ts`.

## Indexing (Exact / Lossy / Full-Text / Structured)
- Full-text in-memory backend: `FullTextMemoryBackend` in `src/api/Indexing/fulltext/FullTextMemoryBackend.ts`
  - Combines `LossyIndex` + `ExactIndex`, implements `IndexReader` + `IndexWriter`.
- Full-text DDB backend: `FullTextDdbBackend` in `src/api/Indexing/fulltext/FullTextDdbBackend.ts`.
- Exact/lossy S3 helpers (in-memory maps for tests): `ExactS3` + `LossyS3` in `src/api/Indexing/exact/ExactS3.ts`, `src/api/Indexing/lossy/LossyS3.ts`.
- Structured in-memory backend: `StructuredInMemoryBackend` in `src/api/Indexing/structured/StructuredInMemoryBackend.ts`.
