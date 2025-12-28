import type { DocId } from './types.js';

export function compareDocId(left: DocId, right: DocId): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function normalizeDocId(value: unknown, primaryField: string): DocId {
  if (value === null || value === undefined || value === '') {
    throw new Error(`Document is missing a non-empty primary field "${primaryField}".`);
  }

  return String(value);
}
