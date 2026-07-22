/**
 * @packageDocumentation
 *
 * DynamoDB schema constants and key encoders for fulltext records in the
 * unified Voltra index table.
 */
import {
  INDEX_ITEM_KINDS,
  INDEX_KEY_PARTS,
  INDEX_TABLE_KIND_ATTRIBUTE,
  INDEX_TABLE_PARTITION_KEY,
  INDEX_TABLE_SORT_KEY,
  buildIndexDocumentSortKey,
  buildIndexKey,
  buildIndexScalarKey,
  assertIndexSortKey,
  encodeIndexIdentity,
} from "../IndexTable";

export const fullTextKeyPrefixes = {
  /**
   * Prefix for index field values.
   */
  field: "f#",
  /**
   * Prefix for token values.
   */
  token: "t#",
  /**
   * Prefix for document ids.
   */
  doc: "d#",
  /**
   * Prefix for token position values.
   */
  position: "p#",
} as const;

/**
 * LossyPostings table
 * PK: f#{indexField}#t#{token}
 * SK: d#{docId}
 */
export const lossyPostingsSchema = {
  /**
   * Partition key attribute for lossy postings.
   */
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  /**
   * Sort key attribute for lossy postings.
   */
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  /** Original document id retained so numeric identities preserve their type. */
  docIdAttribute: "docId",
} as const;

/**
 * ExactPostings table
 * PK: f#{indexField}#t#{token}
 * SK: d#{docId}
 */
export const exactPostingsSchema = {
  /**
   * Partition key attribute for exact postings.
   */
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  /**
   * Sort key attribute for exact postings.
   */
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  /**
   * Attribute name holding position arrays.
   */
  positionsAttribute: "positions",
} as const;

/**
 * Optional FullTextDocMirror table
 * PK: d#{docId}
 */
export const fullTextDocMirrorSchema = {
  /**
   * Partition key attribute for document mirrors.
   */
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  /** Sort key distinguishes field mirrors within a document partition. */
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  /**
   * Attribute name for stored normalized content.
   */
  contentAttribute: "content",
} as const;

/**
 * FullTextTokenStats table
 * PK: f#{indexField}#t#{token}
 */
export const fullTextTokenStatsSchema = {
  /**
   * Partition key attribute for token stats.
   */
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  /** Singleton state member within the token statistics partition. */
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  /**
   * Attribute name for document frequency values.
   */
  documentFrequencyAttribute: "df",
} as const;

/**
 * Optional DocTokens table
 * PK: d#{docId}
 * SK: f#{indexField}#t#{token}
 */
export const docTokensSchema = {
  /**
   * Partition key attribute for doc token membership.
   */
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  /**
   * Sort key attribute for doc token membership.
   */
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
} as const;

/**
 * Optional DocTokenPositions table
 * PK: d#{docId}
 * SK: f#{indexField}#t#{token}
 */
export const docTokenPositionsSchema = {
  /**
   * Partition key attribute for doc token positions.
   */
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  /**
   * Sort key attribute for doc token positions.
   */
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  /**
   * Attribute name holding position arrays.
   */
  positionsAttribute: "positions",
} as const;

/**
 * Encode a token key for token-based tables.
 * @param indexField Field name the token was indexed under. Use a type-qualified
 * field name (for example "Article.title") when multiple types share fields.
 * @param token Token value.
 * @returns Encoded token key.
 */
export function encodeTokenKey(
  indexField: string,
  token: string,
  kind: "lossy" | "exact" | "stats" = "lossy",
): string {
  const itemKind =
    kind === "exact"
      ? INDEX_ITEM_KINDS.fullTextExactPosting
      : kind === "stats"
        ? INDEX_ITEM_KINDS.fullTextTokenStats
        : INDEX_ITEM_KINDS.fullTextLossyPosting;
  return buildIndexKey(itemKind, indexField, token);
}

/**
 * Encode a document key for document-based tables.
 * @param docId Document id to encode.
 * @returns Encoded document key.
 */
export function encodeDocKey(
  docId: string | number,
  kind: "tokens" | "positions" = "tokens",
): string {
  return buildIndexScalarKey(
    kind === "positions"
      ? INDEX_ITEM_KINDS.fullTextTokenPositions
      : INDEX_ITEM_KINDS.fullTextDocumentToken,
    "document",
    docId,
  );
}

/**
 * Encode the key used for the document mirror table.
 * @param indexField Field name the document was indexed under. Use a
 * type-qualified field name when multiple types share fields.
 * @param docId Document id to encode.
 * @returns Encoded document mirror key.
 */
export function encodeDocMirrorKey(
  indexField: string | number,
  docId: string | number,
): string {
  return buildIndexScalarKey(
    INDEX_ITEM_KINDS.fullTextDocumentMirror,
    "document",
    docId,
  );
}

/** Sort key for one field mirror within a document mirror partition. */
export function encodeDocMirrorSortKey(indexField: string | number): string {
  return assertIndexSortKey(
    `${INDEX_KEY_PARTS.field}#${encodeIndexIdentity(indexField)}`,
  );
}

/** Singleton sort key used by token-stat records. */
export const FULL_TEXT_TOKEN_STATS_SORT_KEY = INDEX_KEY_PARTS.state;

/**
 * Encode sort key for token-to-document tables.
 * @param docId Document id to encode.
 * @returns Encoded sort key for token docs.
 */
export function encodeTokenDocSortKey(docId: string | number): string {
  return buildIndexDocumentSortKey(docId);
}

/**
 * Encode sort key for document-to-token tables.
 * @param indexField Field name the token was indexed under. Use a
 * type-qualified field name when multiple types share fields.
 * @param token Token value.
 * @returns Encoded sort key for doc tokens.
 */
export function encodeDocTokenSortKey(
  indexField: string,
  token: string,
): string {
  return assertIndexSortKey(
    `${INDEX_KEY_PARTS.field}#${encodeIndexIdentity(indexField)}#${INDEX_KEY_PARTS.token}#${encodeIndexIdentity(token)}`,
  );
}

/**
 * Encode sort key for token positions within a document.
 * @param indexField Field name the token was indexed under. Use a
 * type-qualified field name when multiple types share fields.
 * @param token Token value.
 * @param position Token position within the document.
 * @returns Encoded sort key for token positions.
 */
export function encodeDocTokenPositionSortKey(
  indexField: string,
  token: string,
  position: number,
): string {
  return `${encodeDocTokenSortKey(indexField, token)}#${fullTextKeyPrefixes.position}${position}`;
}
