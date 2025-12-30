/**
 * @packageDocumentation
 *
 * DynamoDB schema helpers for the lossy postings table. The lossy index stores
 * token -> docId mappings for recall-oriented search.
 */
import type { DocId } from "../types.js";

export type LossyDdbKey = {
  /**
   * Token value stored in the lossy index.
   */
  token: string;
  /**
   * Field name the token was indexed under.
   */
  indexField: string;
  /**
   * Document id containing the token.
   */
  docId: DocId;
};

export type LossyDdbItem = LossyDdbKey;

/**
 * Schema metadata for the lossy postings table.
 */
export const lossyDdbSchema = {
  partitionKey: 'token',
  sortKey: 'docId',
} as const;

/**
 * Build the DynamoDB key for a lossy postings item.
 * @param token Token value stored in the lossy index.
 * @param indexField Field name the token was indexed under.
 * @param docId Document id containing the token.
 * @returns Lossy postings key for DynamoDB.
 */
export function buildLossyDdbKey(
  token: string,
  indexField: string,
  docId: DocId,
): LossyDdbKey {
  return { token, indexField, docId };
}
