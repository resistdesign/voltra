/**
 * @packageDocumentation
 *
 * Lambda-friendly handler that wraps indexing and search operations for a
 * configured {@link IndexBackend}. Use this when you want a single entry point
 * for indexDocument/removeDocument/searchLossy/searchExact.
 */
import { indexDocument, removeDocument, searchExact, searchLossy } from "./api";
import { resolveSearchLimits, type SearchLimits } from "./handler/config";
import type { DocumentRecord, IndexBackend } from "./types";
import { createSearchTrace } from "./trace";

/**
 * Event payload to index a document.
 * */
export type IndexDocumentEvent = {
  /**
   * Action discriminator for indexing.
   */
  action: 'indexDocument';
  /**
   * Document record to index.
   */
  document: DocumentRecord;
  /**
   * Optional primary field name (defaults to "id").
   */
  primaryField?: string;
  /**
   * Optional index field name (defaults to "text").
   */
  indexField?: string;
};

/**
 * Event payload to remove a document from the index.
 * */
export type RemoveDocumentEvent = {
  /**
   * Action discriminator for removals.
   */
  action: 'removeDocument';
  /**
   * Document record to remove.
   */
  document: DocumentRecord;
  /**
   * Optional primary field name (defaults to "id").
   */
  primaryField?: string;
  /**
   * Optional index field name (defaults to "text").
   */
  indexField?: string;
};

/**
 * Event payload to run a lossy search.
 * */
export type SearchLossyEvent = {
  /**
   * Action discriminator for lossy search.
   */
  action: 'searchLossy';
  /**
   * Query string to search for.
   */
  query: string;
  /**
   * Optional index field name (defaults to "text").
   */
  indexField?: string;
  /**
   * Optional maximum number of results to return.
   */
  limit?: number;
  /**
   * Optional cursor string for pagination.
   */
  cursor?: string;
  /**
   * Optional limits override for search execution.
   */
  limits?: SearchLimits;
};

/**
 * Event payload to run an exact search.
 * */
export type SearchExactEvent = {
  /**
   * Action discriminator for exact search.
   */
  action: 'searchExact';
  /**
   * Query string to search for.
   */
  query: string;
  /**
   * Optional index field name (defaults to "text").
   */
  indexField?: string;
  /**
   * Optional maximum number of results to return.
   */
  limit?: number;
  /**
   * Optional cursor string for pagination.
   */
  cursor?: string;
  /**
   * Optional limits override for search execution.
   */
  limits?: SearchLimits;
};

/**
 * Union of supported handler events.
 * */
export type HandlerEvent =
  | IndexDocumentEvent
  | RemoveDocumentEvent
  | SearchLossyEvent
  | SearchExactEvent;

/**
 * Dependencies required by the handler.
 * */
export type HandlerDependencies = {
  /**
   * Index backend used for all operations.
   */
  backend: IndexBackend;
};

/**
 * Basic lambda response shape.
 * */
export type LambdaResponse = {
  /**
   * HTTP status code for the response.
   */
  statusCode: number;
  /**
   * Serialized response body.
   */
  body: string;
};

let dependencies: HandlerDependencies | undefined;

/**
 * Configure the handler with concrete implementations.
 *
 * Example index event:
 * { "action": "indexDocument", "document": { "id": 42, "text": "Hello world" }, "primaryField": "id", "indexField": "text" }
 *
 * Example remove event:
 * { "action": "removeDocument", "document": { "id": 42, "text": "Hello world" } }
 *
 * Example lossy search event:
 * { "action": "searchLossy", "query": "hello world", "indexField": "text", "limit": 10 }
 *
 * Example exact search event:
 * { "action": "searchExact", "query": "\"hello world\"", "indexField": "text", "limit": 10 }
 * @returns Nothing.
 */
export function setHandlerDependencies(
  /**
   * Concrete dependencies used by the handler.
   */
  value: HandlerDependencies,
): void {
  dependencies = value;
}

/**
 * Handle index and search actions for a backend.
 * @returns Lambda response with status and body payload.
 * */
export async function handler(
  /**
   * Handler event describing the action to execute.
   */
  event: HandlerEvent,
): Promise<LambdaResponse> {
  if (!dependencies) {
    throw new Error("Handler dependencies are not configured. Call setHandlerDependencies().");
  }

  switch (event.action) {
    case "indexDocument":
      await indexDocument({
        document: event.document,
        primaryField: event.primaryField ?? "id",
        indexField: event.indexField ?? "text",
        backend: dependencies.backend,
      });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    case "removeDocument":
      await removeDocument({
        document: event.document,
        primaryField: event.primaryField ?? "id",
        indexField: event.indexField ?? "text",
        backend: dependencies.backend,
      });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    case "searchLossy": {
      const trace = createSearchTrace();
      const limits = resolveSearchLimits(event.limits);
      const result = await searchLossy({
        query: event.query,
        indexField: event.indexField ?? "text",
        limit: event.limit,
        cursor: event.cursor,
        backend: dependencies.backend,
        limits,
        trace,
      });
      const { startTimeMs, ...traceDetails } = trace;
      const elapsedMs = Date.now() - startTimeMs;
      console.log(
        JSON.stringify({ action: event.action, trace: { ...traceDetails, elapsedMs, limits } }),
      );
      return { statusCode: 200, body: JSON.stringify(result) };
    }
    case "searchExact": {
      const trace = createSearchTrace();
      const limits = resolveSearchLimits(event.limits);
      const result = await searchExact({
        query: event.query,
        indexField: event.indexField ?? "text",
        limit: event.limit,
        cursor: event.cursor,
        backend: dependencies.backend,
        limits,
        trace,
      });
      const { startTimeMs, ...traceDetails } = trace;
      const elapsedMs = Date.now() - startTimeMs;
      console.log(
        JSON.stringify({ action: event.action, trace: { ...traceDetails, elapsedMs, limits } }),
      );
      return { statusCode: 200, body: JSON.stringify(result) };
    }
    default:
      return { statusCode: 400, body: JSON.stringify({ error: "Unsupported action." }) };
  }
}
