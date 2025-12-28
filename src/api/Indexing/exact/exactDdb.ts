import type { DocId } from '../types.js';

export type ExactDdbKey = {
  token: string;
  indexField: string;
  docId: DocId;
};

export type ExactDdbItem = ExactDdbKey & {
  positions: number[];
};

export const exactDdbSchema = {
  partitionKey: 'token',
  sortKey: 'docId',
  positionsAttribute: 'positions',
} as const;

export function buildExactDdbKey(token: string, indexField: string, docId: DocId): ExactDdbKey {
  return { token, indexField, docId };
}

export function buildExactDdbItem(
  token: string,
  indexField: string,
  docId: DocId,
  positions: number[],
): ExactDdbItem {
  return { token, indexField, docId, positions: [...positions] };
}
