/**
 * @packageDocumentation
 *
 * S3 helpers for storing lossy postings. Each token is stored as a JSON list
 * of doc IDs under a deterministic key.
 */
import type { DocId } from "../types";

export type LossyS3Pointer = {
  bucket: string;
  key: string;
};

export function buildLossyS3Key(token: string, indexField: string): string {
  return `lossy/${encodeURIComponent(indexField)}/${encodeURIComponent(token)}.json`;
}

const lossyStore = new Map<string, DocId[]>();

const buildStoreKey = (pointer: LossyS3Pointer): string => `${pointer.bucket}/${pointer.key}`;

export async function storeLossyIndex(pointer: LossyS3Pointer, docIds: DocId[]): Promise<void> {
  lossyStore.set(buildStoreKey(pointer), [...docIds]);
}

export async function loadLossyIndex(pointer: LossyS3Pointer): Promise<DocId[]> {
  return [...(lossyStore.get(buildStoreKey(pointer)) ?? [])];
}
