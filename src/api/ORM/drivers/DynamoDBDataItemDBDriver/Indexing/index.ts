/**
 * DynamoDB-specific indexing persistence and adapters.
 *
 * Generic indexing semantics live under `src/api/Indexing`; this folder owns
 * only the DynamoDB bridge required to execute those contracts.
 */
export * from "./AwsSdkV3Adapter";
export * from "./Types";
export * from "./IndexMutationCoordinator";
export * from "./ExactDdb";
export * from "./LossyDdb";
export * from "./FullTextDdbBackend";
export * from "./StructuredDdb";
export * from "./StructuredDdbBackend";
export * from "./RelationalDdb";
