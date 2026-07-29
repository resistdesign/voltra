/**
 * @packageDocumentation
 *
 * One logical indexed-query engine backed by exact, range, occupancy, text,
 * and relational physical capabilities.
 *
 * Concepts:
 * - Doc IDs can be strings or numbers; they are normalized for cursor and key
 *   encoding when persisted or paginated.
 * - Public ORM query cursors describe the complete logical indexed plan.
 * - Tokenization helpers normalize text for exact tokens or lossy trigrams.
 * - Search traces capture metrics (token counts, batch calls, etc.) for observability.
 *
 * Quick usage:
 * ```ts
 * import { indexDocument, searchLossy } from "./Indexing";
 *
 * await indexDocument({ backend, indexField: "title", docId: "doc-1", text: "Hello world" });
 * const page = await searchLossy({ backend, indexField: "title", query: "Hello", limit: 10 });
 * ```
 */
export * from "./API";
export * from "./Cursor";
export * from "./IndexTable";
export * from "./fieldQualification";
export * from "./ddb/AwsSdkV3Adapter";
export * from "./ddb/Types";
export * from "./ddb/IndexMutationCoordinator";
export * from "./exact/ExactDdb";
export * from "./exact/ExactIndex";
export * from "./exact/ExactS3";
export * from "./fulltext/FullTextMemoryBackend";
export * from "./fulltext/FullTextDdbBackend";
export * from "./fulltext/Schema";
export * from "./lossy/LossyDdb";
export * from "./lossy/LossyIndex";
export * from "./lossy/LossyS3";
export * from "./rel/RelationalInMemoryBackend";
export * from "./rel/RelationalDdb";
export * from "./rel/Cursor";
export * from "./rel/Handlers";
export * from "./rel/Types";
export * from "./structured/index";
export * from "./query";
export * from "./tokenize";
export * from "./Types";
export * from "./Trace";
export * from "./Handler/Config";
