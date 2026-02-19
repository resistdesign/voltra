# Spec Test Scenario Cram Problem

All of the tests in this project have a problem where multiple scenarios are crammed into one expectation in the spec
file.

The spec files support multiple `tests` for a reason: Multiple scenarios, multiple expectations.

The companion TypeScript files that they reference can stay as one file but should export multiple functions, each
representing a test/scenario in the spec file. That's the whole point of a test having an `export` property.

Please clean-up these tests so that they are still in their same files but the test scenarios are broken up into
appropriate exports.

**BE VERY CAREFUL**, these tests keep this project stable and in order and we want the same *MEANING* and *PURPOSE* of
each test scenario on the other side of this effort.

## Plan

- [x] Phase 1: Split foundational non-E2E scenario bundles into discrete spec tests
  - [x] Split `src/build/TypeMapping.spec.json` + `src/build/TypeMapping.test-utils.ts`
  - [x] Split `src/build/TypeParsing.spec.json` + `src/build/TypeParsing.test-utils.ts`
  - [x] Split `src/common/SearchUtils.spec.json` + `src/common/SearchUtils.test-utils.ts`
  - [x] Split `src/common/SearchValidation.spec.json` + `src/common/SearchValidation.test-utils.ts`
  - [x] Run focused verification for the four updated spec files
- [~] Phase 2: Continue splitting remaining single-test spec files in plan order by directory
  - Remaining: 25 single-test spec files still need scenario-split refactors.
  - [x] Batch 1 (`src/common`)
  - [x] Split `src/common/SearchTypes.spec.json` + `src/common/SearchTypes.test-utils.ts`
  - [x] Split `src/common/StringTransformers.spec.json` + `src/common/StringTransformers.test-utils.ts`
  - [x] Split `src/common/TypeInfoDataItemUtils.spec.json` + `src/common/TypeInfoDataItemUtils.test-utils.ts`
  - [x] Split `src/common/Routing.spec.json` + `src/common/Routing.test-utils.ts`
  - [x] Run focused verification for Batch 1 specs
  - [x] Batch 2 (`src/common`)
  - [x] Split `src/common/IdGeneration/getSimpleId.spec.json` + `src/common/IdGeneration/getSimpleId.test-utils.ts`
  - [x] Split `src/common/ItemRelationshipInfoTypes.spec.json` + `src/common/ItemRelationshipInfoTypes.test-utils.ts`
  - [x] Split `src/common/ItemRelationships/ItemRelationshipValidation.spec.json` + `src/common/ItemRelationships/ItemRelationshipValidation.test-utils.ts`
  - [x] Split `src/common/HelperTypes.spec.json` + `src/common/HelperTypes.test-utils.ts`
  - [x] Run focused verification for Batch 2 specs
  - [x] Batch 3 (`src/common`)
  - [x] Split `src/common/CommandLine/collectRequiredEnvironmentVariables.spec.json` + `src/common/CommandLine/collectRequiredEnvironmentVariables.test-utils.ts`
  - [x] Split `src/common/Logging/Utils.spec.json` + `src/common/Logging/Utils.test-utils.ts`
  - [x] Split `src/common/TypeInfoORM/Types.spec.json` + `src/common/TypeInfoORM/Types.test-utils.ts`
  - [x] Split `src/common/TypeParsing/Utils.spec.json` + `src/common/TypeParsing/Utils.test-utils.ts`
  - [x] Run focused verification for Batch 3 specs
  - [x] Batch 4 (`src/common`)
  - [x] Split `src/common/Testing/Utils.spec.json` + `src/common/Testing/Utils.test-utils.ts`
  - [x] Split `src/common/TypeParsing/ParsingUtils/ParsingUtils.spec.json` + `src/common/TypeParsing/ParsingUtils/ParsingUtils.test-utils.ts`
  - [x] Run focused verification for Batch 4 specs
  - [x] Batch 5 (`src/app/utils`)
  - [x] Split `src/app/utils/ApplicationState.spec.json` + `src/app/utils/ApplicationState.test-utils.ts`
  - [x] Split `src/app/utils/Controller.spec.json` + `src/app/utils/Controller.test-utils.ts`
  - [x] Split `src/app/utils/RouteHistory.spec.json` + `src/app/utils/RouteHistory.test-utils.ts`
  - [x] Split `src/app/utils/Service.spec.json` + `src/app/utils/Service.test-utils.ts`
  - [x] Run focused verification for Batch 5 specs
  - [x] Batch 6 (`src/app`)
  - [x] Split `src/app/forms/core/getFieldKind.spec.json` + `src/app/forms/core/getFieldKind.test-utils.ts`
  - [x] Split `src/app/forms/index.spec.json` + `src/app/forms/index.test-utils.ts`
  - [x] Split `src/app/index.spec.json` + `src/app/index.test-utils.ts`
  - [x] Split `src/app/utils/ApplicationStateLoader.spec.json` + `src/app/utils/ApplicationStateLoader.test-utils.ts`
  - [x] Split `src/app/utils/Debug.spec.json` + `src/app/utils/Debug.test-utils.ts`
  - [x] Split `src/app/utils/TypeInfoORMAPIUtils.spec.json` + `src/app/utils/TypeInfoORMAPIUtils.test-utils.ts`
  - [x] Split `src/app/utils/TypeInfoORMClient.spec.json` + `src/app/utils/TypeInfoORMClient.test-utils.ts`
  - [x] Run focused verification for Batch 6 specs
  - [x] Batch 7 (`src/api` non-E2E)
  - [x] Split `src/api/Router/Router.spec.json` + `src/api/Router/Router.test-utils.ts`
  - [x] Split `src/api/DataAccessControl.spec.json` + `src/api/DataAccessControl.test-utils.ts`
  - [x] Split `src/api/ORM/ListItemUtils.spec.json` + `src/api/ORM/ListItemUtils.test-utils.ts`
  - [x] Split `src/api/Indexing/Handler.spec.json` + `src/api/Indexing/Handler.test-utils.ts`
  - [x] Run focused verification for Batch 7 specs
  - [x] Batch 8 (`src/api/Indexing` non-E2E)
  - [x] Split `src/api/Indexing/IndexingCore.spec.json` + `src/api/Indexing/IndexingCore.test-utils.ts`
  - [x] Split `src/api/Indexing/exact/ExactIndex.spec.json` + `src/api/Indexing/exact/ExactIndex.test-utils.ts`
  - [x] Split `src/api/Indexing/fulltext/FullTextMemoryBackend.spec.json` + `src/api/Indexing/fulltext/FullTextMemoryBackend.test-utils.ts`
  - [x] Split `src/api/Indexing/lossy/LossyIndex.spec.json` + `src/api/Indexing/lossy/LossyIndex.test-utils.ts`
  - [x] Run focused verification for Batch 8 specs
  - [x] Batch 9 (`src/api/Indexing` support)
  - [x] Split `src/api/Indexing/IndexingEnvVarMapping.spec.json` + `src/api/Indexing/IndexingEnvVarMapping.test-utils.ts`
  - [x] Split `src/api/Indexing/IndexingTablesValidation.spec.json` + `src/api/Indexing/IndexingTablesValidation.test-utils.ts`
  - [x] Split `src/api/Indexing/exact/ExactS3.spec.json` + `src/api/Indexing/exact/ExactS3.test-utils.ts`
  - [x] Split `src/api/Indexing/lossy/LossyS3.spec.json` + `src/api/Indexing/lossy/LossyS3.test-utils.ts`
  - [x] Run focused verification for Batch 9 specs
  - [x] Batch 10 (`src/api/Indexing` relational + structured)
  - [x] Split `src/api/Indexing/rel/RelationalIndexing.spec.json` + `src/api/Indexing/rel/RelationalIndexing.test-utils.ts`
  - [x] Split `src/api/Indexing/structured/StructuredInMemoryBackend.spec.json` + `src/api/Indexing/structured/StructuredInMemoryBackend.test-utils.ts`
  - [x] Run focused verification for Batch 10 specs
  - [x] Batch 11 (`src/api/ORM` core drivers)
  - [x] Split `src/api/ORM/TypeInfoORMService.structured.spec.json` + `src/api/ORM/TypeInfoORMService.structured.test-utils.ts`
  - [x] Split `src/api/ORM/drivers/DynamoDBDataItemDBDriver.spec.json` + `src/api/ORM/drivers/DynamoDBDataItemDBDriver.test-utils.ts`
  - [x] Split `src/api/ORM/drivers/InMemoryDataItemDBDriver.spec.json` + `src/api/ORM/drivers/InMemoryDataItemDBDriver.test-utils.ts`
  - [x] Split `src/api/ORM/drivers/InMemoryFileItemDBDriver.spec.json` + `src/api/ORM/drivers/InMemoryFileItemDBDriver.test-utils.ts`
  - [x] Run focused verification for Batch 11 specs
  - [x] Batch 12 (`src/api/ORM` remaining drivers)
  - [x] Split `src/api/ORM/drivers/InMemoryItemRelationshipDBDriver.spec.json` + `src/api/ORM/drivers/InMemoryItemRelationshipDBDriver.test-utils.ts`
  - [x] Split `src/api/ORM/drivers/IndexingRelationshipDriver.spec.json` + `src/api/ORM/drivers/IndexingRelationshipDriver.test-utils.ts`
  - [x] Split `src/api/ORM/drivers/S3FileItemDBDriver.spec.json` + `src/api/ORM/drivers/S3FileItemDBDriver.test-utils.ts`
  - [x] Split `src/api/ORM/drivers/common/SupportedTypeInfoORMDBDrivers.spec.json` + `src/api/ORM/drivers/common/SupportedTypeInfoORMDBDrivers.test-utils.ts`
  - [x] Run focused verification for Batch 12 specs
  - [x] Batch 13 (`src/api/DBX` search + aggregates)
  - [x] Split `src/api/DBX/DBX_SEARCH_EXACT_E2E.spec.json` + `src/api/DBX/DBX_SEARCH_EXACT_E2E.test-utils.ts`
  - [x] Split `src/api/DBX/DBX_SEARCH_LOSSY_E2E.spec.json` + `src/api/DBX/DBX_SEARCH_LOSSY_E2E.test-utils.ts`
  - [x] Split `src/api/DBX/DBX_AGGREGATES_E2E.spec.json` + `src/api/DBX/DBX_AGGREGATES_E2E.test-utils.ts`
  - [x] Run focused verification for Batch 13 specs
  - [x] Batch 14 (`src/api/DBX` validation + scale + collisions)
  - [x] Split `src/api/DBX/DBX_VALIDATION_E2E.spec.json` + `src/api/DBX/DBX_VALIDATION_E2E.test-utils.ts`
  - [x] Split `src/api/DBX/DBX_SCALE_E2E.spec.json` + `src/api/DBX/DBX_SCALE_E2E.test-utils.ts`
  - [x] Split `src/api/DBX/DBX_INDEX_COLLISION_E2E.spec.json` + `src/api/DBX/DBX_INDEX_COLLISION_E2E.test-utils.ts`
  - [x] Run focused verification for Batch 14 specs
