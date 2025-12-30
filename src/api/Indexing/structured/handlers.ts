/**
 * @packageDocumentation
 *
 * Lambda-style handler for structured indexing (index/search). Configure it
 * with {@link setStructuredHandlerDependencies}.
 */
import { searchStructured } from "./searchStructured.js";
import type { DocId } from '../types.js';
import { normalizeDocId } from '../docId.js';
import type { StructuredSearchDependencies } from './searchStructured.js';
import type { StructuredDocFieldsRecord } from './structuredDdb.js';
import type { StructuredQueryOptions, Where } from './types.js';

/**
 * Document payload for structured indexing.
 */
export type StructuredDocumentRecord = {
  /**
   * Document id for the structured record.
   */
  id: DocId | number;
  /**
   * Structured fields to index.
   */
  fields: StructuredDocFieldsRecord;
};

/**
 * Event payload for structured document indexing.
 */
export type StructuredIndexDocumentEvent = {
  /**
   * Action discriminator for indexing.
   */
  action: 'indexDocument';
  /**
   * Document payload to index.
   */
  document: StructuredDocumentRecord;
};

/**
 * Event payload for structured searches.
 */
export type StructuredSearchEvent = {
  /**
   * Action discriminator for structured search.
   */
  action: 'searchStructured';
  /**
   * Structured query clause.
   */
  where: Where;
  /**
   * Optional maximum number of results to return.
   */
  limit?: number;
  /**
   * Optional cursor string for pagination.
   */
  cursor?: string;
};

/**
 * Union of structured handler events.
 */
export type StructuredHandlerEvent = StructuredIndexDocumentEvent | StructuredSearchEvent;

/**
 * Writer interface for structured indexing.
 */
export type StructuredWriter = {
  /**
   * Write structured fields for a document.
   * @param docId Document id to write.
   * @param fields Structured fields to store.
   * @returns Promise resolved once stored.
   */
  write(docId: DocId, fields: StructuredDocFieldsRecord): Promise<void>;
};

/**
 * Reader interface for structured searching.
 */
export type StructuredReader = StructuredSearchDependencies;

/**
 * Reader/writer dependencies for the structured handler.
 */
export type StructuredHandlerDependencies = {
  /**
   * Reader dependencies used for search.
   */
  reader: StructuredReader;
  /**
   * Writer dependency used for indexing.
   */
  writer: StructuredWriter;
};

/**
 * Lambda-style response payload.
 */
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

let dependencies: StructuredHandlerDependencies | undefined;

/**
 * Configure the structured handler with concrete implementations.
 *
 * Example index event:
 * {
 *   "action": "indexDocument",
 *   "document": { "id": "doc-42", "fields": { "category": "news", "tags": ["a", "b"] } }
 * }
 *
 * Example search event:
 * {
 *   "action": "searchStructured",
 *   "where": { "and": [{ "type": "term", "field": "category", "mode": "eq", "value": "news" }] },
 *   "limit": 10,
 *   "cursor": "eyJ2IjoxLCJsYXN0RG9jSWQiOiJkb2MtNDIifQ"
 * }
 * @returns Nothing.
 */
export function setStructuredHandlerDependencies(
  /**
   * Reader/writer dependencies used by the handler.
   */
  value: StructuredHandlerDependencies,
): void {
  dependencies = value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWhereValue(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function isStructuredFields(value: unknown): value is StructuredDocFieldsRecord {
  if (!isPlainRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => {
    if (Array.isArray(entry)) {
      return entry.every((item) => isWhereValue(item));
    }

    return isWhereValue(entry);
  });
}

function validateSearchOptions(options: StructuredQueryOptions): string | undefined {
  if (options.limit !== undefined && (typeof options.limit !== 'number' || options.limit <= 0)) {
    return 'Search limit must be a positive number.';
  }

  if (options.cursor !== undefined && typeof options.cursor !== 'string') {
    return 'Search cursor must be a string.';
  }

  return undefined;
}

function errorResponse(message: string): LambdaResponse {
  return { statusCode: 400, body: JSON.stringify({ error: message }) };
}

/**
 * Handle structured indexing and search events.
 * @param event Handler event describing the operation to execute.
 * @returns Lambda response with status and body payload.
 */
export async function structuredHandler(
  event: StructuredHandlerEvent,
): Promise<LambdaResponse> {
  if (!dependencies) {
    throw new Error(
      'Structured handler dependencies are not configured. Call setStructuredHandlerDependencies().',
    );
  }

  if (!event || typeof event !== 'object') {
    return errorResponse('Event payload must be an object.');
  }

  switch (event.action) {
    case 'indexDocument': {
      if (!event.document) {
        return errorResponse('Document is required for indexing.');
      }

      let docId: DocId;
      try {
        docId = normalizeDocId(event.document.id, 'id');
      } catch (error) {
        return errorResponse((error as Error).message);
      }

      if (!isStructuredFields(event.document.fields)) {
        return errorResponse('Document fields must be a structured record.');
      }

      await dependencies.writer.write(docId, event.document.fields);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
    case 'searchStructured': {
      if (!isPlainRecord(event.where)) {
        return errorResponse('Search where clause must be an object.');
      }

      const validationError = validateSearchOptions({
        limit: event.limit,
        cursor: event.cursor,
      });

      if (validationError) {
        return errorResponse(validationError);
      }

      const result = await searchStructured(dependencies.reader, event.where, {
        limit: event.limit,
        cursor: event.cursor,
      });
      const cursor = result.cursor ?? event.cursor;
      return { statusCode: 200, body: JSON.stringify({ ...result, cursor }) };
    }
    default:
      return errorResponse('Unsupported action.');
  }
}
