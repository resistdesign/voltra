/**
 * @packageDocumentation
 *
 * DynamoDB schema helpers for structured indexing (term, range, and doc fields).
 */
import type { DocId } from "../types.js";
import type { WhereValue } from "./types.js";

/**
 * Document fields stored for structured indexing.
 */
export type StructuredDocFieldsRecord = Record<string, WhereValue | WhereValue[]>;

/**
 * Term query mode for structured indexing.
 */
export type StructuredTermMode = 'eq' | 'contains';

export type StructuredTermIndexKey = {
  /**
   * Partition key for term index entries.
   */
  termKey: string;
  /**
   * Document id containing the term.
   */
  docId: DocId;
};

export type StructuredTermIndexItem = StructuredTermIndexKey & {
  /**
   * Field name being indexed.
   */
  field: string;
  /**
   * Stored field value.
   */
  value: WhereValue;
  /**
   * Term match mode for the entry.
   */
  mode: StructuredTermMode;
};

export type StructuredRangeIndexKey = {
  /**
   * Field name being indexed.
   */
  field: string;
  /**
   * Range key used for ordering.
   */
  rangeKey: string;
};

export type StructuredRangeIndexItem = StructuredRangeIndexKey & {
  /**
   * Stored field value.
   */
  value: WhereValue;
  /**
   * Document id containing the value.
   */
  docId: DocId;
};

export type StructuredDocFieldsKey = {
  /**
   * Document id for the record.
   */
  docId: DocId;
};

export type StructuredDocFieldsItem = StructuredDocFieldsKey & {
  /**
   * Structured fields stored for the document.
   */
  fields: StructuredDocFieldsRecord;
};

/**
 * Schema metadata for the structured term index table.
 */
export const structuredTermIndexSchema = {
  tableName: 'StructuredTermIndex',
  partitionKey: 'termKey',
  sortKey: 'docId',
  fieldAttribute: 'field',
  valueAttribute: 'value',
  modeAttribute: 'mode',
} as const;

/**
 * Schema metadata for the structured range index table.
 */
export const structuredRangeIndexSchema = {
  tableName: 'StructuredRangeIndex',
  partitionKey: 'field',
  sortKey: 'rangeKey',
  valueAttribute: 'value',
  docIdAttribute: 'docId',
} as const;

/**
 * Schema metadata for the structured document fields table.
 */
export const structuredDocFieldsSchema = {
  tableName: 'StructuredDocFields',
  partitionKey: 'docId',
  fieldsAttribute: 'fields',
} as const;

/**
 * Serialize a structured value for DynamoDB key usage.
 * @param value Structured value to serialize.
 * @returns Serialized string representation.
 */
export function serializeStructuredValue(value: WhereValue): string {
  if (value === null) {
    return 'null';
  }

  switch (typeof value) {
    case 'number':
      return `n:${value}`;
    case 'string':
      return `s:${value}`;
    case 'boolean':
      return `b:${value ? '1' : '0'}`;
    default:
      return `u:${String(value)}`;
  }
}

/**
 * Build the term index partition key for a field/value/mode.
 * @param field Field name being indexed.
 * @param value Field value.
 * @param mode Term mode for the entry.
 * @returns Term key for the structured term index.
 */
export function buildStructuredTermKey(
  field: string,
  value: WhereValue,
  mode: StructuredTermMode,
): string {
  return `${field}#${mode}#${serializeStructuredValue(value)}`;
}

/**
 * Build the range key for a value/doc id pair.
 * @param value Field value.
 * @param docId Document id containing the value.
 * @returns Range key for the structured range index.
 */
export function buildStructuredRangeKey(value: WhereValue, docId: DocId): string {
  return `${serializeStructuredValue(value)}#${docId}`;
}

/**
 * Build a structured term index item.
 * @param field Field name being indexed.
 * @param value Field value.
 * @param mode Term mode for the entry.
 * @param docId Document id containing the value.
 * @returns Structured term index item.
 */
export function buildStructuredTermItem(
  field: string,
  value: WhereValue,
  mode: StructuredTermMode,
  docId: DocId,
): StructuredTermIndexItem {
  return {
    termKey: buildStructuredTermKey(field, value, mode),
    docId,
    field,
    value,
    mode,
  };
}

/**
 * Build a structured range index item.
 * @param field Field name being indexed.
 * @param value Field value.
 * @param docId Document id containing the value.
 * @returns Structured range index item.
 */
export function buildStructuredRangeItem(
  field: string,
  value: WhereValue,
  docId: DocId,
): StructuredRangeIndexItem {
  return {
    field,
    rangeKey: buildStructuredRangeKey(value, docId),
    value,
    docId,
  };
}

/**
 * Build a structured document fields item.
 * @param docId Document id for the record.
 * @param fields Structured fields to store.
 * @returns Structured doc fields item.
 */
export function buildStructuredDocFieldsItem(
  docId: DocId,
  fields: StructuredDocFieldsRecord,
): StructuredDocFieldsItem {
  return { docId, fields };
}
