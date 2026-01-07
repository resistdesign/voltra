/**
 * @packageDocumentation
 *
 * Indexing utilities and backends for exact, lossy, fulltext, relational, and
 * structured search.
 *
 * Concepts:
 * - Doc IDs can be strings or numbers; they are normalized for cursor and key
 *   encoding when persisted or paginated.
 * - Cursors are URL-safe tokens that encode paging state (lossy/exact/structured/rel).
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
export * from "./Cursor.js";
export * from "./ddb/AwsSdkV3Adapter.js";
export * from "./ddb/Types.js";
export * from "./exact/ExactDdb.js";
export * from "./exact/ExactIndex.js";
export * from "./exact/ExactS3.js";
export * from "./fulltext/FullTextMemoryBackend.js";
export {
  FullTextDdbBackend,
  FullTextDdbWriter,
  type BatchGetItemInput,
  type BatchGetItemOutput,
  type BatchWriteItemInput,
  type BatchWriteItemOutput,
  type FullTextTableNames,
  type GetItemInput,
  type GetItemOutput,
  type KeysAndAttributes,
  type QueryInput,
  type QueryOutput,
} from "./fulltext/FullTextDdbBackend.js";
export * from "./fulltext/Schema.js";
export * from "./lossy/LossyDdb.js";
export * from "./lossy/LossyIndex.js";
export * from "./lossy/LossyS3.js";
export * from "./rel/RelationalInMemoryBackend.js";
export * from "./rel/RelationalDdb.js";
export * from "./rel/Cursor.js";
export {
  handler as relHandler,
  setRelationalHandlerDependencies,
  type EdgePutEvent,
  type EdgeRemoveEvent,
  type EdgeQueryEvent,
  type RelationalHandlerDependencies,
  type RelationalHandlerEvent,
  type LambdaResponse as RelLambdaResponse,
} from "./rel/Handlers.js";
export * from "./rel/Types.js";
export * from "./structured/index.js";
export * from "./tokenize.js";
export * from "./Types.js";
export * from "./Trace.js";
export type { ResolvedSearchLimits } from "./Handler/Config.js";
