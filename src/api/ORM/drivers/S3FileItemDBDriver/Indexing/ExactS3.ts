/**
 * @packageDocumentation
 *
 * S3 key helpers for the exact (position-aware) index. The S3 layout stores
 * token postings with positions encoded in JSON for batch retrieval.
 */
import type { DocId } from "../../../../Indexing/Types";
import { encodeIndexScalarIdentity } from "../../../../Indexing/IndexTable";
import {
  AwsS3IndexObjectStore,
  type S3IndexObjectStore,
} from "./S3IndexObjectStore";

/**
 * Location of an exact postings object in S3.
 */
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
  return `exact/${encodeURIComponent(indexField)}/${encodeURIComponent(token)}/${encodeURIComponent(encodeIndexScalarIdentity(docId))}.json`;
}

const getExactS3Store = (
  pointer: ExactS3Pointer,
  store?: S3IndexObjectStore,
): S3IndexObjectStore =>
  store ?? new AwsS3IndexObjectStore({ bucketName: pointer.bucket });

/**
 * Store exact token positions for a pointer.
 * @param pointer Bucket/key pair for the postings object.
 * @param positions Token positions within the document.
 * @param store Optional driver-local object store override, primarily for tests.
 * @returns Promise resolved once positions are stored.
 */
export async function storeExactPositions(
  pointer: ExactS3Pointer,
  positions: number[],
  store?: S3IndexObjectStore,
): Promise<void> {
  await getExactS3Store(pointer, store).put(pointer.key, [...positions]);
}

/**
 * Load exact token positions for a pointer.
 * @param pointer Bucket/key pair for the postings object.
 * @param store Optional driver-local object store override, primarily for tests.
 * @returns Positions array (empty when not found).
 */
export async function loadExactPositions(
  pointer: ExactS3Pointer,
  store?: S3IndexObjectStore,
): Promise<number[]> {
  const record = await getExactS3Store(pointer, store).get<number[]>(
    pointer.key,
  );

  return [...(record?.value ?? [])];
}
