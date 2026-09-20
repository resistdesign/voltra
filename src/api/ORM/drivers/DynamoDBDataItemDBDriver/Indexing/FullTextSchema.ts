import {
  INDEX_TABLE_KIND_ATTRIBUTE,
  INDEX_TABLE_PARTITION_KEY,
  INDEX_TABLE_SORT_KEY,
} from "../../../../Indexing/IndexTable";

export * from "../../../../Indexing/fulltext/Schema";

/** DynamoDB attribute schema for lossy full-text postings. */
export const lossyPostingsSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  docIdAttribute: "docId",
} as const;

/** DynamoDB attribute schema for exact full-text postings. */
export const exactPostingsSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  positionsAttribute: "positions",
} as const;

/** DynamoDB attribute schema for full-text document mirrors. */
export const fullTextDocMirrorSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  contentAttribute: "content",
} as const;

/** DynamoDB attribute schema for token statistics. */
export const fullTextTokenStatsSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  documentFrequencyAttribute: "df",
} as const;

/** DynamoDB attribute schema for document-token membership. */
export const docTokensSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
} as const;

/** DynamoDB attribute schema for document token positions. */
export const docTokenPositionsSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  positionsAttribute: "positions",
} as const;
