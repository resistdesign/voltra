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
  action: 'indexDocument';
  document: DocumentRecord;
  primaryField?: string;
  indexField?: string;
};

/**
 * Event payload to remove a document from the index.
 * */
export type RemoveDocumentEvent = {
  action: 'removeDocument';
  document: DocumentRecord;
  primaryField?: string;
  indexField?: string;
};

/**
 * Event payload to run a lossy search.
 * */
export type SearchLossyEvent = {
  action: 'searchLossy';
  query: string;
  indexField?: string;
  limit?: number;
  cursor?: string;
  limits?: SearchLimits;
};

/**
 * Event payload to run an exact search.
 * */
export type SearchExactEvent = {
  action: 'searchExact';
  query: string;
  indexField?: string;
  limit?: number;
  cursor?: string;
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
  backend: IndexBackend;
};

/**
 * Basic lambda response shape.
 * */
export type LambdaResponse = {
  statusCode: number;
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
 */
export function setHandlerDependencies(value: HandlerDependencies): void {
  dependencies = value;
}

/**
 * Handle index and search actions for a backend.
 * */
export async function handler(event: HandlerEvent): Promise<LambdaResponse> {
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
