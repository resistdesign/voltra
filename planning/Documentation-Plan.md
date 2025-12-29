# Voltra Documentation Plan

Curated checklist of docs to write or improve, based on `src/` coverage.

Notes
- Documentation is JSDoc in `src/**` and is rendered via TypeDoc (`yarn doc`). No manual API pages are authored.
- Checklist items under `api` mean "add or expand JSDoc on the referenced modules and concepts."

Legend: [ ] todo, [~] in progress, [x] done

## api
- [x] Add/expand JSDoc in `src/api/**` (TypeDoc output is generated; no manual API pages)
- [x] DataAccessControl overview + example policies
- [x] Indexing
  - [x] cursor/docId/tokenize/trace concepts + usage
  - [x] exact index (S3/Dynamo backends)
  - [x] fulltext index (memory/Dynamo backends)
  - [x] lossy index (S3/Dynamo backends)
  - [x] rel indexing (inMemory/relationalDdb/handlers/types)
  - [x] structured indexing (inMemory/structuredDdb/handlers)
  - [x] handler + api facade examples
- [x] ORM
  - [x] drivers (DynamoDBDataItemDBDriver, S3FileItemDBDriver, IndexingRelationshipDriver)
  - [x] drivers/common (Supported drivers + selection rules)
  - [x] indexing (criteriaToStructuredWhere)
  - [x] ListItemUtils patterns
  - [x] ORMRouteMap usage
  - [x] TypeInfoORMService configuration + lifecycle
  - [x] DACUtils reference
- [x] Router (Auth/AWS/CORS/Types) overview + wiring examples

## app
- [x] utils
  - [x] ApplicationState + loader lifecycle
  - [x] Controller (events, hooks, patterns)
  - [x] Debug helpers
  - [x] EasyLayout usage + examples
  - [x] Route + router patterns
  - [x] Service abstraction + DI approach
  - [x] TypeInfoORMAPIUtils usage
  - [x] TypeInfoORMClient usage
- [x] app index exports + import patterns

## common
- [x] CommandLine (collectRequiredEnvironmentVariables)
- [x] HelperTypes reference
- [x] IdGeneration (getSimpleId)
- [x] ItemRelationshipInfoTypes + relationships model
- [x] ItemRelationships validation rules
- [x] Logging utilities
- [x] Routing helpers
- [x] SearchTypes + SearchUtils patterns
- [x] SearchValidation rules + examples
- [x] StringTransformers (built-ins + custom)
- [x] Testing (Vest helpers + authoring specs)
- [x] TypeInfoDataItemUtils usage
- [x] TypeInfoORM types + helpers
- [x] TypeParsing
  - [x] ParsingUtils guide
  - [x] Validation rules + examples
  - [x] TypeInfo/TypeMapping/TypeParsing/Utils reference

## iac
- [ ] SimpleCFT usage + examples
- [ ] packs
  - [ ] auth
  - [ ] auth/user-management
  - [ ] build
  - [ ] build/utils
  - [ ] cdn
  - [ ] cloud-function
  - [ ] database
  - [ ] dns
  - [ ] file-storage
  - [ ] gateway
  - [ ] repo
  - [ ] ssl-certificate
- [ ] types (generated; document behavior, avoid editing generated files)
- [ ] utils (patch-utils, index)
- [ ] iac index exports

## docs site
- [ ] Astro site structure + build pipeline overview
- [ ] API docs generation flow (TypeDoc -> docs -> site-dist)
- [ ] IaC demo build output (site-dist/iac)

## project
- [ ] Build and test commands
- [ ] Release/checklist notes (if any)
- [ ] Contribution guidelines + PR expectations
