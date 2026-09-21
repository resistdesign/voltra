/**
 * @packageDocumentation
 *
 * S3 helpers for storing lossy postings. Each token is stored as a JSON list
 * of doc IDs under a deterministic key.
 */
import type { DocId } from "../../../../Indexing/Types";
import {
  AwsS3IndexObjectStore,
  type S3IndexObjectStore,
} from "./S3IndexObjectStore";

/**
 * Location of a lossy postings object in S3.
 */
export type LossyS3Pointer = {
  /**
   * Bucket name containing the lossy postings object.
   */
  bucket: string;
  /**
   * Object key for the lossy postings object.
   */
  key: string;
};

/**
 * Build the S3 key for a lossy postings object.
 * @param token Token value stored in the lossy index.
 * @param indexField Field name the token was indexed under.
 * @returns Object key for the lossy postings JSON.
 */
export function buildLossyS3Key(token: string, indexField: string): string {
  return `lossy/${encodeURIComponent(indexField)}/${encodeURIComponent(token)}.json`;
}

const getLossyS3Store = (
  pointer: LossyS3Pointer,
  store?: S3IndexObjectStore,
): S3IndexObjectStore =>
  store ?? new AwsS3IndexObjectStore({ bucketName: pointer.bucket });

/**
 * Store lossy postings for a pointer.
 * @param pointer Bucket/key pair for the postings object.
 * @param docIds Document ids to store for the token.
 * @param store Optional driver-local object store override, primarily for tests.
 * @returns Promise resolved once postings are stored.
 */
export async function storeLossyIndex(
  pointer: LossyS3Pointer,
  docIds: DocId[],
  store?: S3IndexObjectStore,
): Promise<void> {
  await getLossyS3Store(pointer, store).put(pointer.key, [...docIds]);
}

/**
 * Load lossy postings for a pointer.
 * @param pointer Bucket/key pair for the postings object.
 * @param store Optional driver-local object store override, primarily for tests.
 * @returns Document ids stored for the token.
 */
export async function loadLossyIndex(
  pointer: LossyS3Pointer,
  store?: S3IndexObjectStore,
): Promise<DocId[]> {
  const record = await getLossyS3Store(pointer, store).get<DocId[]>(
    pointer.key,
  );

  return [...(record?.value ?? [])];
}
