# Missing Top Level Export Doc Comments

Goal: identify exported declarations missing a direct JSDoc block (e.g., `AddDNSConfig`) and add the missing doc comments.

Scope and exclusions:
- Scanned `src/**/*.ts` and `src/**/*.tsx`.
- Excluded `*.test-utils.*`, `*.spec.*`, and generated IaC files: `src/iac/types/IaCTypes.ts`, `src/iac/types/CloudFormationResourceSpecification.ts`.

Legend: [ ] todo, [x] done

## src/api/Indexing/exact/exactDdb.ts
- [x] type `ExactDdbKey` (line 9)
- [x] type `ExactDdbItem` (line 24)

## src/api/Indexing/exact/exactIndex.ts
- [x] type `ExactQueryOptions` (line 10)
- [x] type `ExactQueryResult` (line 21)
- [x] class `ExactIndex` (line 56)

## src/api/Indexing/exact/exactS3.ts
- [x] type `ExactS3Pointer` (line 9)

## src/api/Indexing/fulltext/ddbBackend.ts
- [x] type `BatchWriteItemInput` (line 29)
- [x] type `BatchWriteItemOutput` (line 36)
- [x] type `KeysAndAttributes` (line 43)
- [x] type `BatchGetItemInput` (line 54)
- [x] type `BatchGetItemOutput` (line 61)
- [x] type `GetItemInput` (line 72)
- [x] type `GetItemOutput` (line 83)
- [x] type `WriteRequest` (line 90)
- [x] type `DynamoBatchWriter` (line 101)
- [x] type `QueryInput` (line 122)
- [x] type `QueryOutput` (line 149)
- [x] type `DynamoQueryClient` (line 160)
- [x] type `FullTextDdbWriterConfig` (line 169)
- [x] type `FullTextDdbBackendConfig` (line 589)
- [x] type `LossyPostingsPage` (line 596)
- [x] type `LossyPostingsPageOptions` (line 607)

## src/api/Indexing/fulltext/memoryBackend.ts
- [x] class `FullTextMemoryBackend` (line 21)

## src/api/Indexing/lossy/lossyDdb.ts
- [x] type `LossyDdbKey` (line 9)
- [x] type `LossyDdbItem` (line 24)

## src/api/Indexing/lossy/lossyIndex.ts
- [x] type `LossyQueryOptions` (line 10)
- [x] type `LossyQueryResult` (line 21)
- [x] class `LossyIndex` (line 93)

## src/api/Indexing/lossy/lossyS3.ts
- [x] type `LossyS3Pointer` (line 9)

## src/api/Indexing/rel/cursor.ts
- [x] type `RelationalCursorState` (line 1)

## src/api/Indexing/rel/handlers.ts
- [x] type `EdgePutEvent` (line 50)
- [x] type `EdgeRemoveEvent` (line 61)
- [x] type `EdgeQueryEvent` (line 72)
- [x] type `RelationalHandlerEvent` (line 99)
- [x] type `RelationalHandlerDependencies` (line 104)
- [x] type `LambdaResponse` (line 111)

## src/api/Indexing/rel/relationalDdb.ts
- [x] type `RelationEdgesDdbKey` (line 12)
- [x] type `RelationEdgesDdbItem` (line 23)
- [x] type `RelationEdgesQueryRequest` (line 97)
- [x] type `RelationEdgesQueryResult` (line 112)
- [x] type `RelationEdgesDdbDependencies` (line 123)

## src/api/Indexing/rel/types.ts
- [x] type `EdgeKey` (line 11)
- [x] type `Edge` (line 30)
- [x] type `EdgePage` (line 41)
- [x] type `RelationalQueryOptions` (line 52)

## src/api/Indexing/structured/cursor.ts
- [x] type `StructuredCursorState` (line 3)

## src/api/Indexing/structured/handlers.ts
- [x] type `StructuredDocumentRecord` (line 14)
- [x] type `StructuredIndexDocumentEvent` (line 25)
- [x] type `StructuredSearchEvent` (line 36)
- [x] type `StructuredHandlerEvent` (line 55)
- [x] type `StructuredWriter` (line 57)
- [x] type `StructuredReader` (line 67)
- [x] type `StructuredHandlerDependencies` (line 69)
- [x] type `LambdaResponse` (line 80)

## src/api/Indexing/structured/searchStructured.ts
- [x] type `StructuredSearchDependencies` (line 41)

## src/api/Indexing/structured/structuredDdb.ts
- [x] type `StructuredTermIndexKey` (line 19)
- [x] type `StructuredTermIndexItem` (line 30)
- [x] type `StructuredRangeIndexKey` (line 45)
- [x] type `StructuredRangeIndexItem` (line 56)
- [x] type `StructuredDocFieldsKey` (line 67)
- [x] type `StructuredDocFieldsItem` (line 74)

## src/api/Indexing/structured/structuredWriter.ts
- [x] type `StructuredWriterDependencies` (line 15)
- [x] class `StructuredDdbWriter` (line 147)

## src/api/Indexing/structured/types.ts
- [x] type `StructuredTermWhere` (line 13)
- [x] type `StructuredRangeWhere` (line 32)
- [x] type `Where` (line 100)
- [x] type `StructuredQueryOptions` (line 102)
- [x] type `CandidatePage` (line 113)

## src/api/ORM/TypeInfoORMService.ts
- [ ] type `TypeInfoORMIndexingConfig` (line 168)

## src/api/ORM/drivers/InMemoryDataItemDBDriver.ts
- [ ] class `InMemoryDataItemDBDriver` (line 60)

## src/api/ORM/drivers/InMemoryFileItemDBDriver.ts
- [ ] type `InMemoryFileSpecificConfig` (line 20)
- [ ] class `InMemoryFileItemDBDriver` (line 73)

## src/api/ORM/drivers/InMemoryFileItemDBDriver/ConfigTypes.ts
- [ ] type `InMemoryFileSpecificConfig` (line 1)

## src/api/ORM/drivers/InMemoryItemRelationshipDBDriver.ts
- [ ] class `InMemoryItemRelationshipDBDriver` (line 34)

## src/api/ORM/drivers/IndexingRelationshipDriver.ts
- [ ] type `RelationalBackend` (line 19)
- [ ] type `IndexingRelationshipDriverConfig` (line 58)

## src/api/ORM/drivers/S3FileItemDBDriver.ts
- [ ] type `BaseFileItem` (line 37)

## src/api/ORM/drivers/S3FileItemDBDriver/ConfigTypes.ts
- [ ] type `S3SpecificConfig` (line 320)

## src/app/utils/Route.tsx
- [ ] const `RouteContext` (line 65)

## src/app/utils/TypeInfoORMAPIUtils.ts
- [ ] type `TypeInfoORMAPIState` (line 74)

## src/common/TypeParsing/ParsingUtils/getPrimaryFieldForTypeInfo.ts
- [ ] enum `TypeInfoPrimaryFieldErrors` (line 3)

## src/common/TypeParsing/Validation.ts
- [ ] enum `RelationshipValidationType` (line 16)

## src/iac/packs/auth.ts
- [ ] type `AddAuthConfig` (line 11)

## src/iac/packs/auth/user-management.ts
- [ ] type `AddUserManagementConfig` (line 9)

## src/iac/packs/build.ts
- [ ] type `BuildPipelineRepoConfig` (line 14)
- [ ] type `AddBuildPipelineConfig` (line 68)

## src/iac/packs/build/utils.ts
- [ ] interface `Env` (line 59)
- [ ] interface `Proxy` (line 86)
- [ ] interface `Batch` (line 97)
- [ ] interface `Phase` (line 118)
- [ ] type `PhaseConfig` (line 141)
- [ ] interface `ReportGroupNameOrArn` (line 148)
- [ ] interface `Reports` (line 167)
- [ ] interface `ArtifactIdentifier` (line 174)
- [ ] interface `SecondaryArtifacts` (line 193)
- [ ] interface `Artifacts` (line 200)
- [ ] interface `Cache` (line 235)
- [ ] interface `BuildSpec` (line 242)

## src/iac/packs/cdn.ts
- [ ] type `AddCDNConfig` (line 8)

## src/iac/packs/cloud-function.ts
- [ ] type `CloudFunctionRuntime` (line 18)
- [ ] type `AddCloudFunctionConfig` (line 64)

## src/iac/packs/dns.ts
- [ ] type `AddDNSConfig` (line 10)

## src/iac/packs/file-storage.ts
- [ ] type `AddSecureFileStorageConfig` (line 9)

## src/iac/packs/gateway.ts
- [ ] type `AddGatewayAuthorizerConfig` (line 16)
- [ ] type `AddGatewayConfig` (line 35)

## src/iac/packs/repo.ts
- [ ] type `AddRepoConfig` (line 9)

## src/iac/packs/ssl-certificate.ts
- [ ] type `AddSSLCertificateConfig` (line 8)

## src/iac/types/Types.ts
- [ ] type `AttributeType` (line 23)
- [ ] type `PropertyDescriptor` (line 46)
- [ ] type `PropertyType` (line 54)
- [ ] type `ResourceType` (line 61)
- [ ] type `CloudFormationResourceSpecification` (line 84)
- [ ] type `NamespaceStructure` (line 99)

## src/iac/utils/index.ts
- [ ] type `ParameterInfo` (line 15)
- [ ] type `ParameterGroup` (line 180)
