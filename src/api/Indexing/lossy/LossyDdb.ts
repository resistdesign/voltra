/**
 * @packageDocumentation
 *
 * DynamoDB schema helpers for the lossy postings table. The lossy index stores
 * token -> docId mappings for recall-oriented search.
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
 * DynamoDB key shape for lossy postings items.
 */
export type LossyDdbKey = IndexTableKey;

/** Semantic attributes retained on lossy posting records. */
export type LossyDdbIdentity = {
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

/**
 * DynamoDB item shape for lossy postings entries.
 */
export type LossyDdbItem = LossyDdbKey &
  LossyDdbIdentity & {
    /** Logical record family in the unified table. */
    kind: typeof INDEX_ITEM_KINDS.fullTextLossyPosting;
  };

/**
 * Schema metadata for the lossy postings table.
 */
export const lossyDdbSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
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
  return assertIndexTableKey({
    pk: buildIndexKey(INDEX_ITEM_KINDS.fullTextLossyPosting, indexField, token),
    sk: buildIndexDocumentSortKey(docId),
  });
}

/** Build a complete lossy posting item for the unified table. */
export function buildLossyDdbItem(
  token: string,
  indexField: string,
  docId: DocId,
): LossyDdbItem {
  return {
    ...buildLossyDdbKey(token, indexField, docId),
    kind: INDEX_ITEM_KINDS.fullTextLossyPosting,
    token,
    indexField,
    docId,
  };
}
