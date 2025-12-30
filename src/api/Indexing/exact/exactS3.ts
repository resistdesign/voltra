/**
 * @packageDocumentation
 *
 * S3 key helpers for the exact (position-aware) index. The S3 layout stores
 * token postings with positions encoded in JSON for batch retrieval.
 */
import type { DocId } from "../types";

export type ExactS3Pointer = {
  bucket: string;
  key: string;
};

export function buildExactS3Key(token: string, indexField: string, docId: DocId): string {
  return `exact/${encodeURIComponent(indexField)}/${encodeURIComponent(token)}/${docId}.json`;
}

const exactStore = new Map<string, number[]>();

const buildStoreKey = (pointer: ExactS3Pointer): string => `${pointer.bucket}/${pointer.key}`;

export async function storeExactPositions(
  pointer: ExactS3Pointer,
  positions: number[],
): Promise<void> {
  exactStore.set(buildStoreKey(pointer), [...positions]);
}

export async function loadExactPositions(pointer: ExactS3Pointer): Promise<number[]> {
  return [...(exactStore.get(buildStoreKey(pointer)) ?? [])];
}
