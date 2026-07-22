/**
 * @packageDocumentation
 *
 * DynamoDB schema helpers for structured indexing (term, range, and doc fields).
 */
import type { DocId } from "../Types";
import type { WhereValue } from "./Types";
import {
  INDEX_ITEM_KINDS,
  INDEX_KEY_PARTS,
  INDEX_TABLE_KIND_ATTRIBUTE,
  INDEX_TABLE_PARTITION_KEY,
  INDEX_TABLE_SORT_KEY,
  assertIndexTableKey,
  buildIndexDocumentSortKey,
  buildIndexKey,
  encodeExactIndexValue,
  encodeIndexIdentity,
  encodeSortableIndexNumber,
  encodeSortableIndexValue,
  type IndexTableKey,
} from "../IndexTable";

/**
 * Document fields stored for structured indexing. Keys should be type-qualified
 * when multiple types share fields.
 */
export type StructuredDocFieldsRecord = Record<
  string,
  WhereValue | WhereValue[]
>;

/**
 * Term query mode for structured indexing.
 */
export type StructuredTermMode = "eq" | "contains";

/**
 * DynamoDB key shape for term index entries.
 */
export type StructuredTermIndexKey = IndexTableKey;

/**
 * DynamoDB item shape for term index entries.
 */
export type StructuredTermIndexItem = StructuredTermIndexKey & {
  /** Logical item kind in the shared physical table. */
  kind: typeof INDEX_ITEM_KINDS.structuredTerm;
  /** Document id containing the term. */
  docId: DocId;
  /**
   * Field name being indexed. Use a type-qualified field name when multiple
   * types share fields.
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

/**
 * DynamoDB key shape for range index entries.
 */
export type StructuredRangeIndexKey = IndexTableKey;

/**
 * DynamoDB item shape for range index entries.
 */
export type StructuredRangeIndexItem = StructuredRangeIndexKey & {
  /** Logical item kind in the shared physical table. */
  kind: typeof INDEX_ITEM_KINDS.structuredRange;
  /** Field identity being indexed. */
  field: string;
  /**
   * Stored field value.
   */
  value: WhereValue;
  /**
   * Document id containing the value.
   */
  docId: DocId;
};

/**
 * DynamoDB key shape for structured doc fields entries.
 */
export type StructuredDocFieldsKey = IndexTableKey;

/**
 * DynamoDB item shape for structured doc fields entries.
 */
export type StructuredDocFieldsItem = StructuredDocFieldsKey & {
  /** Logical item kind in the shared physical table. */
  kind: typeof INDEX_ITEM_KINDS.structuredDocument;
  /** Document id for the record. */
  docId: DocId;
  /**
   * Structured fields stored for the document.
   */
  fields: StructuredDocFieldsRecord;
  /**
   * Monotonic version used for optimistic concurrency control.
   */
  version: number;
};

/**
 * Loaded document fields state with version.
 */
export type StructuredDocFieldsState = {
  /**
   * Structured fields persisted for the document.
   */
  fields: StructuredDocFieldsRecord;
  /**
   * Monotonic version for optimistic writes.
   */
  version: number;
};

/**
 * Schema metadata for the structured term index table.
 */
export const structuredTermIndexSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  fieldAttribute: "field",
  valueAttribute: "value",
  modeAttribute: "mode",
} as const;

/**
 * Schema metadata for the structured range index table.
 */
export const structuredRangeIndexSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  valueAttribute: "value",
  docIdAttribute: "docId",
} as const;

/**
 * Schema metadata for the structured document fields table.
 */
export const structuredDocFieldsSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  fieldsAttribute: "fields",
  versionAttribute: "version",
} as const;

/**
 * Encode a finite IEEE-754 number so lexicographic key order equals numeric order.
 * @param value Finite number to encode.
 * @returns Fixed-width hexadecimal representation.
 */
export function encodeStructuredNumber(value: number): string {
  return encodeSortableIndexNumber(value);
}

/**
 * Serialize a structured value for DynamoDB key usage.
 * @param value Structured value to serialize.
 * @returns Serialized string representation.
 */
export function serializeStructuredValue(value: WhereValue): string {
  return encodeSortableIndexValue(value);
}

/**
 * Build the term index partition key for a field/value/mode.
 * @param field Field name being indexed. Use a type-qualified field name when
 * multiple types share fields.
 * @param value Field value.
 * @param mode Term mode for the entry.
 * @returns Term key for the structured term index.
 */
export function buildStructuredTermKey(
  field: string,
  value: WhereValue,
  mode: StructuredTermMode,
): string {
  return buildIndexKey(
    INDEX_ITEM_KINDS.structuredTerm,
    field,
    mode,
    encodeExactIndexValue(value),
  );
}

/**
 * Build the range key for a value/doc id pair.
 * @param value Field value.
 * @param docId Document id containing the value.
 * @returns Range key for the structured range index.
 */
export function buildStructuredRangeKey(
  value: WhereValue,
  docId: DocId,
): string {
  return `${encodeSortableIndexValue(value)}#${buildIndexDocumentSortKey(docId)}`;
}

/**
 * Build a structured term index item.
 * @param field Field name being indexed. Use a type-qualified field name when
 * multiple types share fields.
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
  const key = assertIndexTableKey({
    pk: buildStructuredTermKey(field, value, mode),
    sk: buildIndexDocumentSortKey(docId),
  });
  return {
    ...key,
    kind: INDEX_ITEM_KINDS.structuredTerm,
    docId,
    field,
    value,
    mode,
  };
}

/**
 * Build a structured range index item.
 * @param field Field name being indexed. Use a type-qualified field name when
 * multiple types share fields.
 * @param value Field value.
 * @param docId Document id containing the value.
 * @returns Structured range index item.
 */
export function buildStructuredRangeItem(
  field: string,
  value: WhereValue,
  docId: DocId,
): StructuredRangeIndexItem {
  const key = assertIndexTableKey({
    pk: buildIndexKey(INDEX_ITEM_KINDS.structuredRange, field),
    sk: buildStructuredRangeKey(value, docId),
  });
  return {
    ...key,
    kind: INDEX_ITEM_KINDS.structuredRange,
    field,
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
  version: number,
): StructuredDocFieldsItem {
  const key = assertIndexTableKey({
    pk: buildIndexKey(INDEX_ITEM_KINDS.structuredDocument, docId),
    sk: INDEX_KEY_PARTS.state,
  });
  return {
    ...key,
    kind: INDEX_ITEM_KINDS.structuredDocument,
    docId,
    fields,
    version,
  };
}

/** Build the physical key for canonical structured document state. */
export function buildStructuredDocFieldsKey(docId: DocId): IndexTableKey {
  return assertIndexTableKey({
    pk: buildIndexKey(INDEX_ITEM_KINDS.structuredDocument, docId),
    sk: INDEX_KEY_PARTS.state,
  });
}

/** Build the partition key for a structured range stream. */
export function buildStructuredRangePartitionKey(field: string): string {
  return buildIndexKey(INDEX_ITEM_KINDS.structuredRange, field);
}
