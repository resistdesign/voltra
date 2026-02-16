# Missing Export Refinement Report

- Generated: 2026-02-16T19:17:50.448Z
- Barrels with missing type references: 21
- Missing type entries (barrel-scoped): 168
- Unique missing type names: 73
- Exclusion applied: generated AWS IaC resource types under `src/iac/types/`
- Approval format: check `[x]` for types that should be exported from the barrel.

## src/api/Indexing/index.ts (1)

- [ ] StructuredDdbWriter (src/api/Indexing/structured/StructuredWriter.ts) <- StructuredDdbBackend

## src/api/ORM/drivers/common/index.ts (6)

- [ ] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- ItemRelationshipDBDriver
- [ ] ListItemsConfig (src/common/SearchTypes.ts) <- DataItemDBDriver
- [ ] ListItemsResults (src/common/SearchTypes.ts) <- DataItemDBDriver
- [ ] SupportedDataItemDBDriverEntry (src/api/ORM/drivers/common/Types.ts) <- SUPPORTED_TYPE_INFO_ORM_DB_DRIVERS
- [ ] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- DataItemDBDriver, DataItemDBDriverConfig
- [ ] TypeInfoPack (src/common/TypeParsing/TypeInfo.ts) <- SupportedDataItemDBDriverEntry

## src/api/ORM/drivers/index.ts (17)

- [ ] BaseFile (src/api/ORM/drivers/common/Types.ts) <- BaseFileItem, ListFilesResult
- [ ] BaseFileLocationInfo (src/api/ORM/drivers/common/Types.ts) <- BaseFile, CloudFileServiceDriver, S3FileItemDBDriver
- [ ] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver
- [ ] CloudFileServiceDriver (src/api/ORM/drivers/common/Types.ts) <- S3FileItemDBDriver
- [ ] DataItemDBDriver (src/api/ORM/drivers/common/Types.ts) <- DynamoDBDataItemDBDriver, DynamoDBSupportedDataItemDBDriverEntry, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, ItemRelationshipDBDriver, S3FileItemDBDriver, S3SupportedFileItemDBDriverEntry, SupportedDataItemDBDriverEntry
- [ ] DataItemDBDriverConfig (src/api/ORM/drivers/common/Types.ts) <- DynamoDBDataItemDBDriver, DynamoDBSupportedDataItemDBDriverEntry, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, InMemoryFileSupportedDataItemDBDriverEntry, InMemoryItemRelationshipDBDriverConfig, InMemorySupportedDataItemDBDriverEntry, S3FileItemDBDriver, S3SupportedFileItemDBDriverEntry, SupportedDataItemDBDriverEntry
- [ ] InMemoryDataItemDBDriver (src/api/ORM/drivers/InMemoryDataItemDBDriver.ts) <- InMemoryItemRelationshipDBDriver
- [ ] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- InMemoryItemRelationshipDBDriver, InMemoryItemRelationshipDBDriverConfig, IndexingRelationshipDriver, ItemRelationshipDBDriver
- [ ] ItemRelationshipOriginItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver
- [ ] ListItemsConfig (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, S3FileItemDBDriver
- [ ] ListItemsResults (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, IndexingRelationshipDriver
- [ ] ListRelationshipsConfig (src/common/SearchTypes.ts) <- IndexingRelationshipDriver
- [ ] S3SpecificConfig (src/api/ORM/drivers/S3FileItemDBDriver/ConfigTypes.ts) <- S3FileItemDBDriver
- [ ] SearchCriteria (src/common/SearchTypes.ts) <- DynamoDBDataItemDBDriver
- [ ] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- DataItemDBDriver, DataItemDBDriverConfig, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver
- [ ] TypeInfoMap (src/common/TypeParsing/TypeInfo.ts) <- DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, S3SupportedFileItemDBDriverEntry
- [ ] TypeInfoPack (src/common/TypeParsing/TypeInfo.ts) <- DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, SupportedDataItemDBDriverEntry

## src/api/ORM/index.ts (42)

- [ ] AuthInfo (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [ ] BaseDACRole (src/api/DataAccessControl.ts) <- getFullORMDACRole, getItemRelationshipOriginDACRole, getItemTypeDACRole
- [ ] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver, TypeInfoORMService, cleanRelationshipItem, getItemRelationshipDACResourcePath
- [ ] BaseTypeInfoORMServiceConfig (src/api/ORM/TypeInfoORMService.ts) <- getTypeInfoORMRouteMap
- [ ] CustomTypeInfoFieldValidatorMap (src/common/TypeParsing/Validation.ts) <- BaseTypeInfoORMServiceConfig
- [ ] DACAccessResult (src/api/DataAccessControl.ts) <- TypeInfoORMService
- [ ] DACConstraint (src/api/DataAccessControl.ts) <- getItemRelationshipOriginDACConstraint, getItemTypeDACConstraint
- [ ] DACConstraintType (src/api/DataAccessControl.ts) <- getFullORMDACRole, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACRole
- [ ] DACDataItemResourceAccessResultMap (src/api/DataAccessControl.ts) <- TypeInfoORMService, getDACRoleHasAccessToDataItem, mergeDACDataItemResourceAccessResultMaps
- [ ] DACRole (src/api/DataAccessControl.ts) <- TypeInfoORMDACConfig, TypeInfoORMService, getDACRoleHasAccessToDataItem
- [ ] DeleteRelationshipResults (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [ ] IndexingRelationshipDriver (src/api/ORM/drivers/IndexingRelationshipDriver.ts) <- TypeInfoORMService
- [ ] ItemRelationshipDBDriver (src/api/ORM/drivers/common/Types.ts) <- BaseTypeInfoORMServiceConfig, TypeInfoORMService
- [ ] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- InMemoryItemRelationshipDBDriver, InMemoryItemRelationshipDBDriverConfig, IndexingRelationshipDriver, ItemRelationshipDBDriver, TypeInfoORMService
- [ ] ItemRelationshipInfoKeys (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMService
- [ ] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMService
- [ ] ItemRelationshipOriginatingItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- BaseTypeInfoORMServiceConfig, TypeInfoORMService
- [ ] ItemRelationshipOriginInfo (src/common/ItemRelationshipInfoTypes.ts) <- getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole
- [ ] ItemRelationshipOriginItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver
- [ ] ListItemsConfig (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, S3FileItemDBDriver, TypeInfoORMService
- [ ] ListItemsResults (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, IndexingRelationshipDriver, TypeInfoORMService
- [ ] ListRelationshipsConfig (src/common/SearchTypes.ts) <- IndexingRelationshipDriver, TypeInfoORMService
- [ ] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMDACConfig, TypeInfoORMService, getDACRoleHasAccessToDataItem, getDataItemDACResourcePath, getDataItemFieldValueDACResourcePath, getFullORMDACRole, getItemRelationshipDACResourcePath, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACResourcePath, getItemTypeDACRole, getORMDACResourcePath
- [ ] NormalizedCloudFunctionEventData (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [ ] ORMOperation (src/common/TypeInfoORM/Types.ts) <- getDACRoleHasAccessToDataItem, getDataItemDACResourcePath, getItemRelationshipDACResourcePath, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACResourcePath, getItemTypeDACRole, getORMDACResourcePath
- [ ] RelationshipOperation (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [ ] Route (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [ ] RouteAuthConfig (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [ ] RouteHandler (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [ ] RouteMap (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [ ] S3SpecificConfig (src/api/ORM/drivers/S3FileItemDBDriver/ConfigTypes.ts) <- S3FileItemDBDriver
- [ ] SearchCriteria (src/common/SearchTypes.ts) <- DynamoDBDataItemDBDriver, TypeInfoORMService
- [ ] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService, getDACRoleHasAccessToDataItem
- [ ] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- DataItemDBDriver, DataItemDBDriverConfig, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, TypeInfoORMService, getDACRoleHasAccessToDataItem, getDriverMethodWithModifiedError
- [ ] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService
- [ ] TypeInfoMap (src/common/TypeParsing/TypeInfo.ts) <- BaseTypeInfoORMServiceConfig, DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, S3SupportedFileItemDBDriverEntry
- [ ] TypeInfoORMAPI (src/common/TypeInfoORM/Types.ts) <- TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP, TypeInfoORMService
- [ ] TypeInfoORMContext (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [ ] TypeInfoORMDACConfig (src/api/ORM/TypeInfoORMService.ts) <- getTypeInfoORMRouteMap
- [ ] TypeInfoPack (src/common/TypeParsing/TypeInfo.ts) <- DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, SupportedDataItemDBDriverEntry
- [ ] TypeInfoValidationResults (src/common/TypeParsing/Validation.ts) <- TypeInfoORMService
- [ ] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService

## src/api/Router/index.ts (4)

- [ ] CloudFunctionEventRouter (src/api/Router/Types.ts) <- handleCloudFunctionEvent
- [ ] CloudFunctionEventTransformer (src/api/Router/Types.ts) <- AWS, CloudFunctionEventRouter, handleCloudFunctionEvent
- [ ] CloudFunctionResponse (src/api/Router/Types.ts) <- CloudFunctionEventRouter, handleCloudFunctionEvent
- [ ] CORSPatter (src/api/Router/Types.ts) <- CloudFunctionEventRouter, handleCloudFunctionEvent

## src/api/index.ts (26)

- [ ] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver, TypeInfoORMService, cleanRelationshipItem, getItemRelationshipDACResourcePath
- [ ] CustomTypeInfoFieldValidatorMap (src/common/TypeParsing/Validation.ts) <- BaseTypeInfoORMServiceConfig
- [ ] DeleteRelationshipResults (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [ ] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- InMemoryItemRelationshipDBDriver, InMemoryItemRelationshipDBDriverConfig, IndexingRelationshipDriver, ItemRelationshipDBDriver, TypeInfoORMService
- [ ] ItemRelationshipInfoKeys (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMService
- [ ] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMService
- [ ] ItemRelationshipOriginatingItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- BaseTypeInfoORMServiceConfig, TypeInfoORMService
- [ ] ItemRelationshipOriginInfo (src/common/ItemRelationshipInfoTypes.ts) <- getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole
- [ ] ItemRelationshipOriginItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver
- [ ] ListItemsConfig (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, S3FileItemDBDriver, TypeInfoORMService
- [ ] ListItemsResults (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, IndexingRelationshipDriver, TypeInfoORMService
- [ ] ListRelationshipsConfig (src/common/SearchTypes.ts) <- IndexingRelationshipDriver, TypeInfoORMService
- [ ] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- DACResourcePathPart, TypeInfoORMDACConfig, TypeInfoORMService, getDACPathsMatch, getDACRoleHasAccessToDataItem, getDataItemDACResourcePath, getDataItemFieldValueDACResourcePath, getFullORMDACRole, getItemRelationshipDACResourcePath, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACResourcePath, getItemTypeDACRole, getORMDACResourcePath, getResourceAccessByDACRole
- [ ] ORMOperation (src/common/TypeInfoORM/Types.ts) <- getDACRoleHasAccessToDataItem, getDataItemDACResourcePath, getItemRelationshipDACResourcePath, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACResourcePath, getItemTypeDACRole, getORMDACResourcePath
- [ ] RelationshipOperation (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [ ] S3SpecificConfig (src/api/ORM/drivers/S3FileItemDBDriver/ConfigTypes.ts) <- S3FileItemDBDriver
- [ ] SearchCriteria (src/common/SearchTypes.ts) <- DynamoDBDataItemDBDriver, TypeInfoORMService
- [ ] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService, getDACRoleHasAccessToDataItem
- [ ] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- DataItemDBDriver, DataItemDBDriverConfig, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, TypeInfoORMService, getDACRoleHasAccessToDataItem, getDriverMethodWithModifiedError
- [ ] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService
- [ ] TypeInfoMap (src/common/TypeParsing/TypeInfo.ts) <- BaseTypeInfoORMServiceConfig, DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, S3SupportedFileItemDBDriverEntry
- [ ] TypeInfoORMAPI (src/common/TypeInfoORM/Types.ts) <- TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP, TypeInfoORMService
- [ ] TypeInfoORMContext (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [ ] TypeInfoPack (src/common/TypeParsing/TypeInfo.ts) <- DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, SupportedDataItemDBDriverEntry
- [ ] TypeInfoValidationResults (src/common/TypeParsing/Validation.ts) <- TypeInfoORMService
- [ ] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService

## src/app/forms/core/index.ts (4)

- [ ] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- RelationActionPayload
- [ ] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- FieldRenderContext
- [ ] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- FieldValue
- [ ] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- AutoFieldInput, CustomTypeActionPayload, FieldRenderContext, RelationActionPayload, getFieldKind

## src/app/forms/index.ts (6)

- [ ] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- RelationActionPayload
- [ ] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- FieldRenderContext
- [ ] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps, FormController, useFormEngine
- [ ] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- FieldValue, FormValue, FormValues
- [ ] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- AutoFieldProps, CustomTypeActionPayload, FieldRenderContext, FormFieldController, RelationActionPayload, getFieldKind
- [ ] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps, FormController, useFormEngine

## src/app/index.ts (17)

- [ ] ApplicationStateIdentifier (src/app/utils/ApplicationState.tsx) <- ApplicationStateLoaderConfig
- [ ] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMClient
- [ ] DeleteRelationshipResults (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMClient
- [ ] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMClient
- [ ] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- RelationActionPayload
- [ ] ListItemsConfig (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [ ] ListItemsResults (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [ ] ListRelationshipsConfig (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [ ] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- FieldRenderContext
- [ ] ServiceConfig (src/app/utils/Service.ts) <- RemoteProcedureCall, TypeInfoORMClient, sendServiceRequest
- [ ] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps, FormController, useFormEngine
- [ ] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- FieldValue, FormValue, FormValues, TypeInfoORMClient
- [ ] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- AutoFieldProps, CustomTypeActionPayload, FieldRenderContext, FormFieldController, RelationActionPayload, getFieldKind
- [ ] TypeInfoORMAPIRoutePaths (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMClient
- [ ] TypeInfoORMClientAPI (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMAPIState, TypeInfoORMClient, TypeInfoORMServiceAPI, handleRequest, requestHandlerFactory, useTypeInfoORMAPI
- [ ] TypeInfoORMServiceError (src/common/TypeInfoORM/Types.ts) <- BaseTypeInfoORMAPIRequestState, handleRequest
- [ ] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps, FormController, useFormEngine

## src/app/utils/index.ts (10)

- [ ] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMClient
- [ ] DeleteRelationshipResults (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMClient
- [ ] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMClient
- [ ] ListItemsConfig (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [ ] ListItemsResults (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [ ] ListRelationshipsConfig (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [ ] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMClient
- [ ] TypeInfoORMAPIRoutePaths (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMClient
- [ ] TypeInfoORMClientAPI (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMAPIState, TypeInfoORMClient, TypeInfoORMServiceAPI, handleRequest, requestHandlerFactory, useTypeInfoORMAPI
- [ ] TypeInfoORMServiceError (src/common/TypeInfoORM/Types.ts) <- BaseTypeInfoORMAPIRequestState, handleRequest

## src/build/index.ts (2)

- [ ] TypeInfoMap (src/common/TypeParsing/TypeInfo.ts) <- getTypeInfoMapFromTypeScript
- [ ] TypeMap (src/build/TypeMapping.ts) <- getTypeInfoMapFromTypeScript

## src/common/ItemRelationships/index.ts (3)

- [ ] ItemRelationshipInfoKeys (src/common/ItemRelationshipInfoTypes.ts) <- validateRelationshipItem
- [ ] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- validateRelationshipItem
- [ ] TypeInfoValidationResults (src/common/TypeParsing/Validation.ts) <- validateRelationshipItem

## src/common/Testing/index.ts (9)

- [ ] ConditionConfig (src/common/Testing/Types.ts) <- getResolvedConditions
- [ ] EXTRegexExpectation (src/common/Testing/Types.ts) <- OPERATIONS
- [ ] PatternElement (src/common/Testing/Types.ts) <- OPERATIONS
- [ ] RegexExpectation (src/common/Testing/Types.ts) <- OPERATIONS
- [ ] ResolvedTestConfig (src/common/Testing/Types.ts) <- getResolvedTestConfig
- [ ] Test (src/common/Testing/Types.ts) <- generateTestsForFile, getSetupInstance, getTestFunction, runTest
- [ ] TestComparisonOperation (src/common/Testing/Types.ts) <- compare
- [ ] TestConfig (src/common/Testing/Types.ts) <- getTestConfig
- [ ] TestResults (src/common/Testing/Types.ts) <- executeTestingCommand, generateTestsForFile, mergeTestResults, runTest, runTestsForFile

## src/common/TypeInfoORM/index.ts (7)

- [ ] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [ ] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [ ] ListItemsConfig (src/common/SearchTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [ ] ListItemsResults (src/common/SearchTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [ ] ListRelationshipsConfig (src/common/SearchTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [ ] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [ ] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- ORMOperation

## src/common/TypeParsing/index.ts (1)

- [ ] TypeKeyword (src/common/TypeParsing/TypeInfo.ts) <- PRIMITIVE_ERROR_MESSAGE_CONSTANTS, TYPE_KEYWORD_VALIDATORS, TypeInfoField, validateKeywordType, validateTypeInfoFieldValue

## src/common/index.ts (2)

- [ ] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoField
- [ ] TypeKeyword (src/common/TypeParsing/TypeInfo.ts) <- PRIMITIVE_ERROR_MESSAGE_CONSTANTS, TYPE_KEYWORD_VALIDATORS, TypeInfoField, validateKeywordType, validateTypeInfoFieldValue

## src/iac/index.ts (3)

- [ ] ParameterGroup (src/iac/utils/index.ts) <- SimpleCFT
- [ ] ParameterInfo (src/iac/utils/index.ts) <- SimpleCFT, addParameter, addParameters
- [ ] ResourcePackApplier (src/iac/utils/index.ts) <- SimpleCFT, createResourcePack

## src/native/forms/index.ts (2)

- [ ] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps
- [ ] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps

## src/native/index.ts (2)

- [ ] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps
- [ ] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps

## src/web/forms/index.ts (2)

- [ ] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps
- [ ] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps

## src/web/index.ts (2)

- [ ] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps
- [ ] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps

