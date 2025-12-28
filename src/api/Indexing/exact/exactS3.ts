import type { DocId } from '../types.js';

export type ExactS3Pointer = {
  bucket: string;
  key: string;
};

export function buildExactS3Key(token: string, indexField: string, docId: DocId): string {
  return `exact/${encodeURIComponent(indexField)}/${encodeURIComponent(token)}/${docId}.json`;
}

export async function storeExactPositions(
  _pointer: ExactS3Pointer,
  _positions: number[],
): Promise<void> {
  throw new Error('Exact S3 storage not implemented yet.');
}

export async function loadExactPositions(_pointer: ExactS3Pointer): Promise<number[]> {
  throw new Error('Exact S3 load not implemented yet.');
}
