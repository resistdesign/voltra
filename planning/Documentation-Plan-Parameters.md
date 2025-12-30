# Voltra Documentation Plan (Parameter Coverage)

Goal: Add JSDoc that documents every parameter of every export (functions, classes, types, and their props/fields) so consumers have complete, precise usage guidance.

Notes
- Documentation is JSDoc in `src/**` and is rendered via TypeDoc (`yarn doc`). No manual API pages are authored.
- Checklist items under `api` mean "add or expand parameter-level JSDoc on the referenced modules and concepts."
- Cover constructor params, method params, callbacks, option objects, exported types, and all fields in those types.

Legend: [ ] todo, [~] in progress, [x] done

## api
- [ ] Add/expand parameter JSDoc in `src/api/**` (TypeDoc output is generated; no manual API pages)
- [ ] DataAccessControl overview + example policies
- [ ] Indexing
  - [ ] cursor/docId/tokenize/trace concepts + usage
  - [ ] exact index (S3/Dynamo backends)
  - [ ] fulltext index (memory/Dynamo backends)
  - [ ] lossy index (S3/Dynamo backends)
  - [ ] rel indexing (inMemory/relationalDdb/handlers/types)
  - [ ] structured indexing (inMemory/structuredDdb/handlers)
  - [ ] handler + api facade examples
- [ ] ORM
  - [ ] drivers (DynamoDBDataItemDBDriver, S3FileItemDBDriver, IndexingRelationshipDriver)
  - [ ] drivers/common (Supported drivers + selection rules)
  - [ ] indexing (criteriaToStructuredWhere)
  - [ ] ListItemUtils patterns
  - [ ] ORMRouteMap usage
  - [ ] TypeInfoORMService configuration + lifecycle
  - [ ] DACUtils reference
- [ ] Router (Auth/AWS/CORS/Types) overview + wiring examples

## app
- [ ] utils
  - [ ] ApplicationState + loader lifecycle
  - [ ] Controller (events, hooks, patterns)
  - [ ] Debug helpers
  - [ ] EasyLayout usage + examples
  - [ ] Route + router patterns
  - [ ] Service abstraction + DI approach
  - [ ] TypeInfoORMAPIUtils usage
  - [ ] TypeInfoORMClient usage
- [ ] app index exports + import patterns

## common
- [ ] CommandLine (collectRequiredEnvironmentVariables)
- [ ] HelperTypes reference
- [ ] IdGeneration (getSimpleId)
- [ ] ItemRelationshipInfoTypes + relationships model
- [ ] ItemRelationships validation rules
- [ ] Logging utilities
- [ ] Routing helpers
- [ ] SearchTypes + SearchUtils patterns
- [ ] SearchValidation rules + examples
- [ ] StringTransformers (built-ins + custom)
- [ ] Testing (Vest helpers + authoring specs)
- [ ] TypeInfoDataItemUtils usage
- [ ] TypeInfoORM types + helpers
- [ ] TypeParsing
  - [ ] ParsingUtils guide
  - [ ] Validation rules + examples
  - [ ] TypeInfo/TypeMapping/TypeParsing/Utils reference

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
