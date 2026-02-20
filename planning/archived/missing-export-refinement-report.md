# Missing Export Refinement Report

- Generated: 2026-02-16T19:17:50.448Z
- Barrels with missing type references: 21
- Missing type entries (barrel-scoped): 168
- Unique missing type names: 73
- Exclusion applied: generated AWS IaC resource types under `src/iac/types/`
- Approval format: check `[x]` for types that should be exported from the barrel.

## src/api/Indexing/index.ts (1)

- [x] StructuredDdbWriter (src/api/Indexing/structured/StructuredWriter.ts) <- StructuredDdbBackend

## src/api/ORM/drivers/common/index.ts (6)

- [x] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- ItemRelationshipDBDriver
- [x] ListItemsConfig (src/common/SearchTypes.ts) <- DataItemDBDriver
- [x] ListItemsResults (src/common/SearchTypes.ts) <- DataItemDBDriver
- [x] SupportedDataItemDBDriverEntry (src/api/ORM/drivers/common/Types.ts) <- SUPPORTED_TYPE_INFO_ORM_DB_DRIVERS
- [x] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- DataItemDBDriver, DataItemDBDriverConfig
- [x] TypeInfoPack (src/common/TypeParsing/TypeInfo.ts) <- SupportedDataItemDBDriverEntry

## src/api/ORM/drivers/index.ts (17)

- [x] BaseFile (src/api/ORM/drivers/common/Types.ts) <- BaseFileItem, ListFilesResult
- [x] BaseFileLocationInfo (src/api/ORM/drivers/common/Types.ts) <- BaseFile, CloudFileServiceDriver, S3FileItemDBDriver
- [x] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver
- [x] CloudFileServiceDriver (src/api/ORM/drivers/common/Types.ts) <- S3FileItemDBDriver
- [x] DataItemDBDriver (src/api/ORM/drivers/common/Types.ts) <- DynamoDBDataItemDBDriver, DynamoDBSupportedDataItemDBDriverEntry, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, ItemRelationshipDBDriver, S3FileItemDBDriver, S3SupportedFileItemDBDriverEntry, SupportedDataItemDBDriverEntry
- [x] DataItemDBDriverConfig (src/api/ORM/drivers/common/Types.ts) <- DynamoDBDataItemDBDriver, DynamoDBSupportedDataItemDBDriverEntry, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, InMemoryFileSupportedDataItemDBDriverEntry, InMemoryItemRelationshipDBDriverConfig, InMemorySupportedDataItemDBDriverEntry, S3FileItemDBDriver, S3SupportedFileItemDBDriverEntry, SupportedDataItemDBDriverEntry
- [x] InMemoryDataItemDBDriver (src/api/ORM/drivers/InMemoryDataItemDBDriver.ts) <- InMemoryItemRelationshipDBDriver
- [x] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- InMemoryItemRelationshipDBDriver, InMemoryItemRelationshipDBDriverConfig, IndexingRelationshipDriver, ItemRelationshipDBDriver
- [x] ItemRelationshipOriginItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver
- [x] ListItemsConfig (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, S3FileItemDBDriver
- [x] ListItemsResults (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, IndexingRelationshipDriver
- [x] ListRelationshipsConfig (src/common/SearchTypes.ts) <- IndexingRelationshipDriver
- [x] S3SpecificConfig (src/api/ORM/drivers/S3FileItemDBDriver/ConfigTypes.ts) <- S3FileItemDBDriver
- [x] SearchCriteria (src/common/SearchTypes.ts) <- DynamoDBDataItemDBDriver
- [x] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- DataItemDBDriver, DataItemDBDriverConfig, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver
- [x] TypeInfoMap (src/common/TypeParsing/TypeInfo.ts) <- DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, S3SupportedFileItemDBDriverEntry
- [x] TypeInfoPack (src/common/TypeParsing/TypeInfo.ts) <- DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, SupportedDataItemDBDriverEntry

## src/api/ORM/index.ts (42)

- [x] AuthInfo (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [x] BaseDACRole (src/api/DataAccessControl.ts) <- getFullORMDACRole, getItemRelationshipOriginDACRole, getItemTypeDACRole
- [x] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver, TypeInfoORMService, cleanRelationshipItem, getItemRelationshipDACResourcePath
- [x] BaseTypeInfoORMServiceConfig (src/api/ORM/TypeInfoORMService.ts) <- getTypeInfoORMRouteMap
- [x] CustomTypeInfoFieldValidatorMap (src/common/TypeParsing/Validation.ts) <- BaseTypeInfoORMServiceConfig
- [x] DACAccessResult (src/api/DataAccessControl.ts) <- TypeInfoORMService
- [x] DACConstraint (src/api/DataAccessControl.ts) <- getItemRelationshipOriginDACConstraint, getItemTypeDACConstraint
- [x] DACConstraintType (src/api/DataAccessControl.ts) <- getFullORMDACRole, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACRole
- [x] DACDataItemResourceAccessResultMap (src/api/DataAccessControl.ts) <- TypeInfoORMService, getDACRoleHasAccessToDataItem, mergeDACDataItemResourceAccessResultMaps
- [x] DACRole (src/api/DataAccessControl.ts) <- TypeInfoORMDACConfig, TypeInfoORMService, getDACRoleHasAccessToDataItem
- [x] DeleteRelationshipResults (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [x] IndexingRelationshipDriver (src/api/ORM/drivers/IndexingRelationshipDriver.ts) <- TypeInfoORMService
- [x] ItemRelationshipDBDriver (src/api/ORM/drivers/common/Types.ts) <- BaseTypeInfoORMServiceConfig, TypeInfoORMService
- [x] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- InMemoryItemRelationshipDBDriver, InMemoryItemRelationshipDBDriverConfig, IndexingRelationshipDriver, ItemRelationshipDBDriver, TypeInfoORMService
- [x] ItemRelationshipInfoKeys (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMService
- [x] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMService
- [x] ItemRelationshipOriginatingItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- BaseTypeInfoORMServiceConfig, TypeInfoORMService
- [x] ItemRelationshipOriginInfo (src/common/ItemRelationshipInfoTypes.ts) <- getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole
- [x] ItemRelationshipOriginItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver
- [x] ListItemsConfig (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, S3FileItemDBDriver, TypeInfoORMService
- [x] ListItemsResults (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, IndexingRelationshipDriver, TypeInfoORMService
- [x] ListRelationshipsConfig (src/common/SearchTypes.ts) <- IndexingRelationshipDriver, TypeInfoORMService
- [x] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMDACConfig, TypeInfoORMService, getDACRoleHasAccessToDataItem, getDataItemDACResourcePath, getDataItemFieldValueDACResourcePath, getFullORMDACRole, getItemRelationshipDACResourcePath, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACResourcePath, getItemTypeDACRole, getORMDACResourcePath
- [x] NormalizedCloudFunctionEventData (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [x] ORMOperation (src/common/TypeInfoORM/Types.ts) <- getDACRoleHasAccessToDataItem, getDataItemDACResourcePath, getItemRelationshipDACResourcePath, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACResourcePath, getItemTypeDACRole, getORMDACResourcePath
- [x] RelationshipOperation (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [x] Route (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [x] RouteAuthConfig (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [x] RouteHandler (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [x] RouteMap (src/api/Router/Types.ts) <- getTypeInfoORMRouteMap
- [x] S3SpecificConfig (src/api/ORM/drivers/S3FileItemDBDriver/ConfigTypes.ts) <- S3FileItemDBDriver
- [x] SearchCriteria (src/common/SearchTypes.ts) <- DynamoDBDataItemDBDriver, TypeInfoORMService
- [x] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService, getDACRoleHasAccessToDataItem
- [x] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- DataItemDBDriver, DataItemDBDriverConfig, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, TypeInfoORMService, getDACRoleHasAccessToDataItem, getDriverMethodWithModifiedError
- [x] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService
- [x] TypeInfoMap (src/common/TypeParsing/TypeInfo.ts) <- BaseTypeInfoORMServiceConfig, DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, S3SupportedFileItemDBDriverEntry
- [x] TypeInfoORMAPI (src/common/TypeInfoORM/Types.ts) <- TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP, TypeInfoORMService
- [x] TypeInfoORMContext (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [x] TypeInfoORMDACConfig (src/api/ORM/TypeInfoORMService.ts) <- getTypeInfoORMRouteMap
- [x] TypeInfoPack (src/common/TypeParsing/TypeInfo.ts) <- DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, SupportedDataItemDBDriverEntry
- [x] TypeInfoValidationResults (src/common/TypeParsing/Validation.ts) <- TypeInfoORMService
- [x] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService

## src/api/Router/index.ts (4)

- [x] CloudFunctionEventRouter (src/api/Router/Types.ts) <- handleCloudFunctionEvent
- [x] CloudFunctionEventTransformer (src/api/Router/Types.ts) <- AWS, CloudFunctionEventRouter, handleCloudFunctionEvent
- [x] CloudFunctionResponse (src/api/Router/Types.ts) <- CloudFunctionEventRouter, handleCloudFunctionEvent
- [x] CORSPattern (src/api/Router/Types.ts) <- CloudFunctionEventRouter, handleCloudFunctionEvent

## src/api/index.ts (26)

- [x] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver, TypeInfoORMService, cleanRelationshipItem, getItemRelationshipDACResourcePath
- [x] CustomTypeInfoFieldValidatorMap (src/common/TypeParsing/Validation.ts) <- BaseTypeInfoORMServiceConfig
- [x] DeleteRelationshipResults (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [x] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- InMemoryItemRelationshipDBDriver, InMemoryItemRelationshipDBDriverConfig, IndexingRelationshipDriver, ItemRelationshipDBDriver, TypeInfoORMService
- [x] ItemRelationshipInfoKeys (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMService
- [x] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMService
- [x] ItemRelationshipOriginatingItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- BaseTypeInfoORMServiceConfig, TypeInfoORMService
- [x] ItemRelationshipOriginInfo (src/common/ItemRelationshipInfoTypes.ts) <- getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole
- [x] ItemRelationshipOriginItemInfo (src/common/ItemRelationshipInfoTypes.ts) <- IndexingRelationshipDriver
- [x] ListItemsConfig (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, S3FileItemDBDriver, TypeInfoORMService
- [x] ListItemsResults (src/common/SearchTypes.ts) <- DataItemDBDriver, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, InMemoryFileItemDBDriver, IndexingRelationshipDriver, TypeInfoORMService
- [x] ListRelationshipsConfig (src/common/SearchTypes.ts) <- IndexingRelationshipDriver, TypeInfoORMService
- [x] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- DACResourcePathPart, TypeInfoORMDACConfig, TypeInfoORMService, getDACPathsMatch, getDACRoleHasAccessToDataItem, getDataItemDACResourcePath, getDataItemFieldValueDACResourcePath, getFullORMDACRole, getItemRelationshipDACResourcePath, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACResourcePath, getItemTypeDACRole, getORMDACResourcePath, getResourceAccessByDACRole
- [x] ORMOperation (src/common/TypeInfoORM/Types.ts) <- getDACRoleHasAccessToDataItem, getDataItemDACResourcePath, getItemRelationshipDACResourcePath, getItemRelationshipOriginDACConstraint, getItemRelationshipOriginDACResourcePath, getItemRelationshipOriginDACRole, getItemTypeDACConstraint, getItemTypeDACResourcePath, getItemTypeDACRole, getORMDACResourcePath
- [x] RelationshipOperation (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [x] S3SpecificConfig (src/api/ORM/drivers/S3FileItemDBDriver/ConfigTypes.ts) <- S3FileItemDBDriver
- [x] SearchCriteria (src/common/SearchTypes.ts) <- DynamoDBDataItemDBDriver, TypeInfoORMService
- [x] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService, getDACRoleHasAccessToDataItem
- [x] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- DataItemDBDriver, DataItemDBDriverConfig, DynamoDBDataItemDBDriver, InMemoryDataItemDBDriver, TypeInfoORMService, getDACRoleHasAccessToDataItem, getDriverMethodWithModifiedError
- [x] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService
- [x] TypeInfoMap (src/common/TypeParsing/TypeInfo.ts) <- BaseTypeInfoORMServiceConfig, DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, S3SupportedFileItemDBDriverEntry
- [x] TypeInfoORMAPI (src/common/TypeInfoORM/Types.ts) <- TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP, TypeInfoORMService
- [x] TypeInfoORMContext (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMService
- [x] TypeInfoPack (src/common/TypeParsing/TypeInfo.ts) <- DynamoDBSupportedDataItemDBDriverEntry, InMemoryFileSupportedDataItemDBDriverEntry, InMemorySupportedDataItemDBDriverEntry, SupportedDataItemDBDriverEntry
- [x] TypeInfoValidationResults (src/common/TypeParsing/Validation.ts) <- TypeInfoORMService
- [x] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMService

## src/app/forms/core/index.ts (4)

- [x] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- RelationActionPayload
- [x] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- FieldRenderContext
- [x] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- FieldValue
- [x] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- AutoFieldInput, CustomTypeActionPayload, FieldRenderContext, RelationActionPayload, getFieldKind

## src/app/forms/index.ts (6)

- [x] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- RelationActionPayload
- [x] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- FieldRenderContext
- [x] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps, FormController, useFormEngine
- [x] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- FieldValue, FormValue, FormValues
- [x] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- AutoFieldProps, CustomTypeActionPayload, FieldRenderContext, FormFieldController, RelationActionPayload, getFieldKind
- [x] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps, FormController, useFormEngine

## src/app/index.ts (17)

- [x] ApplicationStateIdentifier (src/app/utils/ApplicationState.tsx) <- ApplicationStateLoaderConfig
- [x] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMClient
- [x] DeleteRelationshipResults (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMClient
- [x] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMClient
- [x] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- RelationActionPayload
- [x] ListItemsConfig (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [x] ListItemsResults (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [x] ListRelationshipsConfig (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [x] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- FieldRenderContext
- [x] ServiceConfig (src/app/utils/Service.ts) <- RemoteProcedureCall, TypeInfoORMClient, sendServiceRequest
- [x] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps, FormController, useFormEngine
- [x] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- FieldValue, FormValue, FormValues, TypeInfoORMClient
- [x] TypeInfoField (src/common/TypeParsing/TypeInfo.ts) <- AutoFieldProps, CustomTypeActionPayload, FieldRenderContext, FormFieldController, RelationActionPayload, getFieldKind
- [x] TypeInfoORMAPIRoutePaths (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMClient
- [x] TypeInfoORMClientAPI (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMAPIState, TypeInfoORMClient, TypeInfoORMServiceAPI, handleRequest, requestHandlerFactory, useTypeInfoORMAPI
- [x] TypeInfoORMServiceError (src/common/TypeInfoORM/Types.ts) <- BaseTypeInfoORMAPIRequestState, handleRequest
- [x] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps, FormController, useFormEngine

## src/app/utils/index.ts (10)

- [x] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMClient
- [x] DeleteRelationshipResults (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMClient
- [x] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMClient
- [x] ListItemsConfig (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [x] ListItemsResults (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [x] ListRelationshipsConfig (src/common/SearchTypes.ts) <- TypeInfoORMClient
- [x] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMClient
- [x] TypeInfoORMAPIRoutePaths (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMClient
- [x] TypeInfoORMClientAPI (src/common/TypeInfoORM/Types.ts) <- TypeInfoORMAPIState, TypeInfoORMClient, TypeInfoORMServiceAPI, handleRequest, requestHandlerFactory, useTypeInfoORMAPI
- [x] TypeInfoORMServiceError (src/common/TypeInfoORM/Types.ts) <- BaseTypeInfoORMAPIRequestState, handleRequest

## src/build/index.ts (2)

- [x] TypeInfoMap (src/common/TypeParsing/TypeInfo.ts) <- getTypeInfoMapFromTypeScript
- [x] TypeMap (src/build/TypeMapping.ts) <- getTypeInfoMapFromTypeScript

## src/common/ItemRelationships/index.ts (3)

- [x] ItemRelationshipInfoKeys (src/common/ItemRelationshipInfoTypes.ts) <- validateRelationshipItem
- [x] ItemRelationshipInfoType (src/common/ItemRelationshipInfoTypes.ts) <- validateRelationshipItem
- [x] TypeInfoValidationResults (src/common/TypeParsing/Validation.ts) <- validateRelationshipItem

## src/common/Testing/index.ts (9)

- [x] ConditionConfig (src/common/Testing/Types.ts) <- getResolvedConditions
- [x] EXTRegexExpectation (src/common/Testing/Types.ts) <- OPERATIONS
- [x] PatternElement (src/common/Testing/Types.ts) <- OPERATIONS
- [x] RegexExpectation (src/common/Testing/Types.ts) <- OPERATIONS
- [x] ResolvedTestConfig (src/common/Testing/Types.ts) <- getResolvedTestConfig
- [x] Test (src/common/Testing/Types.ts) <- generateTestsForFile, getSetupInstance, getTestFunction, runTest
- [x] TestComparisonOperation (src/common/Testing/Types.ts) <- compare
- [x] TestConfig (src/common/Testing/Types.ts) <- getTestConfig
- [x] TestResults (src/common/Testing/Types.ts) <- executeTestingCommand, generateTestsForFile, mergeTestResults, runTest, runTestsForFile

## src/common/TypeInfoORM/index.ts (7)

- [x] BaseItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [x] ItemRelationshipInfo (src/common/ItemRelationshipInfoTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [x] ListItemsConfig (src/common/SearchTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [x] ListItemsResults (src/common/SearchTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [x] ListRelationshipsConfig (src/common/SearchTypes.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [x] TypeInfoDataItem (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoORMAPI, TypeInfoORMClientAPI
- [x] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- ORMOperation

## src/common/TypeParsing/index.ts (1)

- [x] TypeKeyword (src/common/TypeParsing/TypeInfo.ts) <- PRIMITIVE_ERROR_MESSAGE_CONSTANTS, TYPE_KEYWORD_VALIDATORS, TypeInfoField, validateKeywordType, validateTypeInfoFieldValue

## src/common/index.ts (2)

- [x] LiteralValue (src/common/TypeParsing/TypeInfo.ts) <- TypeInfoField
- [x] TypeKeyword (src/common/TypeParsing/TypeInfo.ts) <- PRIMITIVE_ERROR_MESSAGE_CONSTANTS, TYPE_KEYWORD_VALIDATORS, TypeInfoField, validateKeywordType, validateTypeInfoFieldValue

## src/iac/index.ts (3)

- [x] ParameterGroup (src/iac/utils/index.ts) <- SimpleCFT
- [x] ParameterInfo (src/iac/utils/index.ts) <- SimpleCFT, addParameter, addParameters
- [x] ResourcePackApplier (src/iac/utils/index.ts) <- SimpleCFT, createResourcePack

## src/native/forms/index.ts (2)

- [x] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps
- [x] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps

## src/native/index.ts (2)

- [x] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps
- [x] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps

## src/web/forms/index.ts (2)

- [x] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps
- [x] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps

## src/web/index.ts (2)

- [x] TypeInfo (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps
- [x] TypeOperation (src/common/TypeParsing/TypeInfo.ts) <- AutoFormProps

