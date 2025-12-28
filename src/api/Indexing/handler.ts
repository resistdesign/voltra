import { indexDocument, removeDocument, searchExact, searchLossy } from './api.js';
import { resolveSearchLimits, type SearchLimits } from './handler/config.js';
import type { DocumentRecord, IndexBackend } from './types.js';
import { createSearchTrace } from './trace.js';

export type IndexDocumentEvent = {
  action: 'indexDocument';
  document: DocumentRecord;
  primaryField?: string;
  indexField?: string;
};

export type RemoveDocumentEvent = {
  action: 'removeDocument';
  document: DocumentRecord;
  primaryField?: string;
  indexField?: string;
};

export type SearchLossyEvent = {
  action: 'searchLossy';
  query: string;
  indexField?: string;
  limit?: number;
  cursor?: string;
  limits?: SearchLimits;
};

export type SearchExactEvent = {
  action: 'searchExact';
  query: string;
  indexField?: string;
  limit?: number;
  cursor?: string;
  limits?: SearchLimits;
};

export type HandlerEvent =
  | IndexDocumentEvent
  | RemoveDocumentEvent
  | SearchLossyEvent
  | SearchExactEvent;

export type HandlerDependencies = {
  backend: IndexBackend;
};

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

export async function handler(event: HandlerEvent): Promise<LambdaResponse> {
  if (!dependencies) {
    throw new Error('Handler dependencies are not configured. Call setHandlerDependencies().');
  }

  switch (event.action) {
    case 'indexDocument':
      await indexDocument({
        document: event.document,
        primaryField: event.primaryField ?? 'id',
        indexField: event.indexField ?? 'text',
        backend: dependencies.backend,
      });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    case 'removeDocument':
      await removeDocument({
        document: event.document,
        primaryField: event.primaryField ?? 'id',
        indexField: event.indexField ?? 'text',
        backend: dependencies.backend,
      });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    case 'searchLossy': {
      const trace = createSearchTrace();
      const limits = resolveSearchLimits(event.limits);
      const result = await searchLossy({
        query: event.query,
        indexField: event.indexField ?? 'text',
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
    case 'searchExact': {
      const trace = createSearchTrace();
      const limits = resolveSearchLimits(event.limits);
      const result = await searchExact({
        query: event.query,
        indexField: event.indexField ?? 'text',
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
      return { statusCode: 400, body: JSON.stringify({ error: 'Unsupported action.' }) };
  }
}
