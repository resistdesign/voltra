import type { DocId } from "./Types";
import { buildIndexDocumentSortKey } from "./IndexTable";

/**
 * Compare two document identities using the same string ordering used by
 * persisted index keys. Numeric primary values are identifiers, not quantities.
 * @returns -1 if left < right, 1 if left > right, or 0 if equal.
 * */
export function compareDocId(
  /**
   * Left document id to compare.
   */
  left: DocId,
  /**
   * Right document id to compare.
   */
  right: DocId,
): number {
  const leftIdentity = buildIndexDocumentSortKey(left);
  const rightIdentity = buildIndexDocumentSortKey(right);
  if (leftIdentity === rightIdentity) {
    return 0;
  }
  return leftIdentity < rightIdentity ? -1 : 1;
}

/**
 * Normalize a document id and enforce that a primary field exists.
 * @returns Normalized document id as a string.
 * */
export function normalizeDocId(
  /**
   * Raw document id value to normalize.
   */
  value: unknown,
  /**
   * Primary field name used for error messaging.
   */
  primaryField: string,
): DocId {
  if (value === null || value === undefined || value === "") {
    throw new Error(
      `Document is missing a non-empty primary field "${primaryField}".`,
    );
  }

  return String(value);
}
