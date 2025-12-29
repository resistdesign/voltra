# Voltra Test Plan (Vest)

Top-level coverage map and progress tracker for `src/`.

Legend: [ ] todo, [~] in progress, [x] done

## api
- [x] DataAccessControl
- [x] Indexing
  - [x] cursor/docId/tokenize/trace
  - [x] exact
  - [x] fulltext
  - [x] lossy
  - [x] rel (inMemory/relationalDdb/handlers/types)
  - [x] structured
  - [x] handler + api facade
- [x] ORM
  - [x] drivers (DynamoDBDataItemDBDriver, S3FileItemDBDriver, IndexingRelationshipDriver)
  - [x] drivers/common
  - [x] indexing (criteriaToStructuredWhere)
  - [x] ListItemUtils
  - [x] ORMRouteMap
  - [x] TypeInfoORMService
  - [x] DACUtils
- [x] Router (Auth/AWS/CORS/Types)

## app
- [x] utils
  - [x] ApplicationState
  - [x] ApplicationStateLoader
  - [x] Controller
  - [x] Debug
  - [x] EasyLayout
  - [x] Route
  - [x] Service
  - [x] TypeInfoORMAPIUtils
  - [x] TypeInfoORMClient
- [x] app index exports

## common
- [x] CommandLine
- [x] HelperTypes
- [x] IdGeneration
- [x] ItemRelationshipInfoTypes
- [x] ItemRelationships
- [x] Logging
- [x] Routing
- [x] SearchTypes
- [x] SearchUtils
- [x] SearchValidation
- [x] StringTransformers
- [x] Testing (Vest helpers)
- [x] TypeInfoDataItemUtils
- [x] TypeInfoORM
- [x] TypeParsing
  - [x] ParsingUtils
  - [x] Validation
  - [x] TypeInfo/TypeMapping/TypeParsing/Utils

## iac
- [x] SimpleCFT
- [ ] packs
  - [x] auth
  - [x] auth/user-management
  - [x] build
  - [x] build/utils
  - [x] cdn
  - [x] cloud-function
  - [x] database
  - [x] dns
  - [ ] file-storage
  - [ ] gateway
  - [ ] repo
  - [ ] ssl-certificate
- [ ] types (generated; add tests around behavior, avoid editing generated files)
- [ ] utils (patch-utils, index)
- [ ] iac index exports

## Notes
- Specs live alongside code as `src/**/*.spec.json`.
- Keep tests close to modules; use `yarn test:gen` only for fixture regen.
- Avoid editing generated IaC types directly; test their public behavior or wrappers.

## In-memory driver gaps (for testing + optional runtime use)
- [x] ORM data items: InMemory `DataItemDBDriver` implementation to satisfy `TypeInfoORMService.getDriver` (`src/api/ORM/TypeInfoORMService.ts`) and `executeDriverListItems` (`src/api/ORM/ListItemUtils.ts`). Current concrete implementation is Dynamo-only (`src/api/ORM/drivers/DynamoDBDataItemDBDriver.ts`).
- [x] ORM relationships (non-indexing path): InMemory `ItemRelationshipDBDriver` for `TypeInfoORMService.getRelationshipDriver` branches in create/delete/list (`src/api/ORM/TypeInfoORMService.ts`). No concrete relationship driver exists today beyond indexing-backed flow.
- [x] ORM files: InMemory `CloudFileServiceDriver` or `DataItemDBDriver` variant to cover `S3FileItemDBDriver` behavior without S3 (`src/api/ORM/drivers/S3FileItemDBDriver.ts` + `src/api/ORM/drivers/S3FileItemDBDriver/S3FileDriver.ts`).
- [x] Indexing structured: InMemory adapter that implements `StructuredSearchDependencies` and `StructuredWriter` for `TypeInfoORMService.indexing.structured` (`src/api/ORM/TypeInfoORMService.ts`). `StructuredInMemoryIndex` exists but does not expose these interfaces (`src/api/Indexing/structured/inMemory.ts`).
- [x] Indexing storage stubs: `src/api/Indexing/exact/exactS3.ts` and `src/api/Indexing/lossy/lossyS3.ts` are throw-only placeholders; add memory backing or complete S3 implementations if persistence coverage is required.
