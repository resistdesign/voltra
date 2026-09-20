/**
 * @packageDocumentation
 *
 * DynamoDB schema helpers for the exact (position-aware) postings table.
 * The exact index stores token positions per document to support phrase queries.
 */
import type { DocId } from "../Types";
import {
  INDEX_ITEM_KINDS,
  INDEX_TABLE_KIND_ATTRIBUTE,
  INDEX_TABLE_PARTITION_KEY,
  INDEX_TABLE_SORT_KEY,
  assertIndexTableKey,
  buildIndexDocumentSortKey,
  buildIndexKey,
  type IndexTableKey,
} from "../IndexTable";

/**
 * DynamoDB key shape for exact postings items.
 */
export type ExactDdbKey = IndexTableKey;

/** Semantic attributes retained on exact posting records. */
export type ExactDdbIdentity = {
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
export type ExactDdbItem = ExactDdbKey &
  ExactDdbIdentity & {
    /** Logical record family in the unified table. */
    kind: typeof INDEX_ITEM_KINDS.fullTextExactPosting;
    /**
     * Token positions within the document.
     */
    positions: number[];
  };

/**
 * Schema metadata for the exact postings table.
 */
export const exactDdbSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  positionsAttribute: "positions",
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
  return assertIndexTableKey({
    pk: buildIndexKey(INDEX_ITEM_KINDS.fullTextExactPosting, indexField, token),
    sk: buildIndexDocumentSortKey(docId),
  });
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
  return {
    ...buildExactDdbKey(token, indexField, docId),
    kind: INDEX_ITEM_KINDS.fullTextExactPosting,
    token,
    indexField,
    docId,
    positions: [...positions],
  };
}
