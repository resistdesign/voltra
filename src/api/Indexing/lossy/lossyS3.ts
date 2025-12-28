import type { DocId } from '../types.js';

export type LossyS3Pointer = {
  bucket: string;
  key: string;
};

export function buildLossyS3Key(token: string, indexField: string): string {
  return `lossy/${encodeURIComponent(indexField)}/${encodeURIComponent(token)}.json`;
}

export async function storeLossyIndex(_pointer: LossyS3Pointer, _docIds: DocId[]): Promise<void> {
  throw new Error('Lossy S3 storage not implemented yet.');
}

export async function loadLossyIndex(_pointer: LossyS3Pointer): Promise<DocId[]> {
  throw new Error('Lossy S3 load not implemented yet.');
}
