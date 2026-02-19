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
  - Remaining: 49 single-test spec files still need scenario-split refactors.
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
