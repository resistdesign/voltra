import type { DocId } from '../types.js';
import type { WhereValue } from './types.js';

export type StructuredDocFieldsRecord = Record<string, WhereValue | WhereValue[]>;

export type StructuredTermMode = 'eq' | 'contains';

export type StructuredTermIndexKey = {
  termKey: string;
  docId: DocId;
};

export type StructuredTermIndexItem = StructuredTermIndexKey & {
  field: string;
  value: WhereValue;
  mode: StructuredTermMode;
};

export type StructuredRangeIndexKey = {
  field: string;
  rangeKey: string;
};

export type StructuredRangeIndexItem = StructuredRangeIndexKey & {
  value: WhereValue;
  docId: DocId;
};

export type StructuredDocFieldsKey = {
  docId: DocId;
};

export type StructuredDocFieldsItem = StructuredDocFieldsKey & {
  fields: StructuredDocFieldsRecord;
};

export const structuredTermIndexSchema = {
  tableName: 'StructuredTermIndex',
  partitionKey: 'termKey',
  sortKey: 'docId',
  fieldAttribute: 'field',
  valueAttribute: 'value',
  modeAttribute: 'mode',
} as const;

export const structuredRangeIndexSchema = {
  tableName: 'StructuredRangeIndex',
  partitionKey: 'field',
  sortKey: 'rangeKey',
  valueAttribute: 'value',
  docIdAttribute: 'docId',
} as const;

export const structuredDocFieldsSchema = {
  tableName: 'StructuredDocFields',
  partitionKey: 'docId',
  fieldsAttribute: 'fields',
} as const;

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

export function buildStructuredTermKey(
  field: string,
  value: WhereValue,
  mode: StructuredTermMode,
): string {
  return `${field}#${mode}#${serializeStructuredValue(value)}`;
}

export function buildStructuredRangeKey(value: WhereValue, docId: DocId): string {
  return `${serializeStructuredValue(value)}#${docId}`;
}

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

export function buildStructuredDocFieldsItem(
  docId: DocId,
  fields: StructuredDocFieldsRecord,
): StructuredDocFieldsItem {
  return { docId, fields };
}
