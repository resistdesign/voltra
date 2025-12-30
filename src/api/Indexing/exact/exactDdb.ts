/**
 * @packageDocumentation
 *
 * DynamoDB schema helpers for the exact (position-aware) postings table.
 * The exact index stores token positions per document to support phrase queries.
 */
import type { DocId } from "../types.js";

/**
 * DynamoDB key shape for exact postings items.
 */
export type ExactDdbKey = {
  /**
   * Token value stored in the exact index.
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

/**
 * DynamoDB item shape for exact postings entries.
 */
export type ExactDdbItem = ExactDdbKey & {
  /**
   * Token positions within the document.
   */
  positions: number[];
};

/**
 * Schema metadata for the exact postings table.
 */
export const exactDdbSchema = {
  partitionKey: 'token',
  sortKey: 'docId',
  positionsAttribute: 'positions',
} as const;

/**
 * Build the DynamoDB key for an exact postings item.
 * @param token Token value stored in the exact index.
 * @param indexField Field name the token was indexed under.
 * @param docId Document id containing the token.
 * @returns Exact postings key for DynamoDB.
 */
export function buildExactDdbKey(
  token: string,
  indexField: string,
  docId: DocId,
): ExactDdbKey {
  return { token, indexField, docId };
}

/**
 * Build a DynamoDB item for an exact postings entry.
 * @param token Token value stored in the exact index.
 * @param indexField Field name the token was indexed under.
 * @param docId Document id containing the token.
 * @param positions Token positions within the document.
 * @returns Exact postings item for DynamoDB.
 */
export function buildExactDdbItem(
  token: string,
  indexField: string,
  docId: DocId,
  positions: number[],
): ExactDdbItem {
  return { token, indexField, docId, positions: [...positions] };
}
