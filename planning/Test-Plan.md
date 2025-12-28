# Voltra Test Plan (Vest)

Top-level coverage map and progress tracker for `src/`.

Legend: [ ] todo, [~] in progress, [x] done

## api
- [ ] DataAccessControl
- [ ] Indexing
  - [ ] cursor/docId/tokenize/trace
  - [ ] exact
  - [ ] fulltext
  - [ ] lossy
  - [ ] rel (inMemory/relationalDdb/handlers/types)
  - [ ] structured
  - [ ] handler + api facade
- [ ] ORM
  - [ ] drivers (DynamoDBDataItemDBDriver, S3FileItemDBDriver, IndexingRelationshipDriver)
  - [ ] drivers/common
  - [ ] indexing (criteriaToStructuredWhere)
  - [ ] ListItemUtils
  - [ ] ORMRouteMap
  - [ ] TypeInfoORMService
  - [ ] DACUtils
- [ ] Router (Auth/AWS/CORS/Types)

## app
- [ ] utils
  - [ ] ApplicationState
  - [ ] ApplicationStateLoader
  - [ ] Controller
  - [ ] Debug
  - [ ] EasyLayout
  - [ ] Route
  - [ ] Service
  - [ ] TypeInfoORMAPIUtils
  - [ ] TypeInfoORMClient
- [ ] app index exports

## common
- [ ] CommandLine
- [ ] HelperTypes
- [ ] IdGeneration
- [ ] ItemRelationshipInfoTypes
- [ ] ItemRelationships
- [ ] Logging
- [ ] Routing
- [ ] SearchTypes
- [ ] SearchUtils
- [ ] SearchValidation
- [ ] Storyboarding
- [ ] StringTransformers
- [ ] Testing (Vest helpers)
- [ ] TypeInfoDataItemUtils
- [ ] TypeInfoORM
- [ ] TypeParsing
  - [ ] ParsingUtils
  - [ ] Validation
  - [ ] TypeInfo/TypeMapping/TypeParsing/Utils

## iac
- [ ] SimpleCFT
- [ ] packs
  - [ ] auth/user-management
  - [ ] build/utils
  - [ ] cdn
  - [ ] cloud-function
  - [ ] database
  - [ ] dns
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
