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
export * from './api.js';
export * from './cursor.js';
export * from './exact/exactDdb.js';
export * from './exact/exactIndex.js';
export * from './exact/exactS3.js';
export * from './fulltext/memoryBackend.js';
export {
  FullTextDdbBackend,
  FullTextDdbWriter,
  type BatchGetItemInput,
  type BatchGetItemOutput,
  type BatchWriteItemInput,
  type BatchWriteItemOutput,
  type GetItemInput,
  type GetItemOutput,
  type KeysAndAttributes,
  type QueryInput,
  type QueryOutput,
} from './fulltext/ddbBackend.js';
export * from './fulltext/schema.js';
export * from './lossy/lossyDdb.js';
export * from './lossy/lossyIndex.js';
export * from './lossy/lossyS3.js';
export * from './rel/inMemory.js';
export * from './rel/relationalDdb.js';
export * from './rel/cursor.js';
export {
  handler as relHandler,
  setRelationalHandlerDependencies,
  type EdgePutEvent,
  type EdgeRemoveEvent,
  type EdgeQueryEvent,
  type RelationalHandlerDependencies,
  type RelationalHandlerEvent,
  type LambdaResponse as RelLambdaResponse,
} from './rel/handlers.js';
export * from './rel/types.js';
export * from './structured/index.js';
export * from './tokenize.js';
export * from './types.js';
export * from './trace.js';
export type { ResolvedSearchLimits } from './handler/config.js';
