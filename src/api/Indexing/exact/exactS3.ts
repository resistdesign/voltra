/**
 * @packageDocumentation
 *
 * S3 key helpers for the exact (position-aware) index. The S3 layout stores
 * token postings with positions encoded in JSON for batch retrieval.
 */
import type { DocId } from "../types";

export type ExactS3Pointer = {
  /**
   * Bucket name containing the exact postings object.
   */
  bucket: string;
  /**
   * Object key for the exact postings object.
   */
  key: string;
};

/**
 * Build the S3 key for an exact postings object.
 * @param token Token value stored in the exact index.
 * @param indexField Field name the token was indexed under.
 * @param docId Document id containing the token.
 * @returns Object key for the exact postings JSON.
 */
export function buildExactS3Key(
  token: string,
  indexField: string,
  docId: DocId,
): string {
  return `exact/${encodeURIComponent(indexField)}/${encodeURIComponent(token)}/${docId}.json`;
}

const exactStore = new Map<string, number[]>();

const buildStoreKey = (pointer: ExactS3Pointer): string => `${pointer.bucket}/${pointer.key}`;

/**
 * Store exact token positions for a pointer.
 * @param pointer Bucket/key pair for the postings object.
 * @param positions Token positions within the document.
 * @returns Promise resolved once positions are stored.
 */
export async function storeExactPositions(
  pointer: ExactS3Pointer,
  positions: number[],
): Promise<void> {
  exactStore.set(buildStoreKey(pointer), [...positions]);
}

/**
 * Load exact token positions for a pointer.
 * @param pointer Bucket/key pair for the postings object.
 * @returns Positions array (empty when not found).
 */
export async function loadExactPositions(pointer: ExactS3Pointer): Promise<number[]> {
  return [...(exactStore.get(buildStoreKey(pointer)) ?? [])];
}
