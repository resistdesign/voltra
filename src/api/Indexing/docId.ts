import type { DocId } from './types.js';

/**
 * Compare two document ids for sorting.
 * */
export function compareDocId(left: DocId, right: DocId): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

/**
 * Normalize a document id and enforce that a primary field exists.
 * */
export function normalizeDocId(value: unknown, primaryField: string): DocId {
  if (value === null || value === undefined || value === '') {
    throw new Error(`Document is missing a non-empty primary field "${primaryField}".`);
  }

  return String(value);
}
