/**
 * @packageDocumentation
 *
 * Storage-neutral key encoders for Voltra full-text index records.
 */
import {
  INDEX_ITEM_KINDS,
  INDEX_KEY_PARTS,
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
