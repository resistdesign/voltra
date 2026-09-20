/**
 * @packageDocumentation
 *
 * Public schema and key factories for Voltra's unified indexing table.
 * Callers provide semantic identities; this module exclusively owns physical
 * separators, namespaces, encoding, and key-size validation.
 */
import type { DocId } from "./Types";
import type { WhereValue } from "./structured/Types";

/** Current logical key format version. */
export const INDEX_KEY_VERSION = "v1";
/** Separator reserved for Voltra-owned key structure. */
export const INDEX_KEY_SEPARATOR = "#";
/** Reusable semantic segments used inside partition and sort keys. */
export const INDEX_KEY_PARTS = {
  boolean: "b",
  document: "d",
  entity: "e",
  exact: "x",
  field: "f",
  generation: "g",
  missing: "m",
  number: "n",
  null: "z",
  position: "p",
  prefix: "r",
  state: "state",
  string: "s",
  token: "t",
} as const;

/** Stable namespaces for every logical record family in the shared table. */
export const INDEX_ITEM_KINDS = {
  structuredTerm: "st",
  structuredRange: "sr",
  structuredDocument: "sd",
  structuredOccupancy: "so",
  structuredMissing: "sm",
  structuredGeneration: "sg",
  fullTextLossyPosting: "fl",
  fullTextExactPosting: "fe",
  fullTextDocumentMirror: "fm",
  fullTextTokenStats: "fs",
  fullTextDocumentToken: "ft",
  fullTextTokenPositions: "fp",
  relationshipEdge: "re",
} as const;

/** Logical kind stored on a unified index item. */
export type IndexItemKind =
  (typeof INDEX_ITEM_KINDS)[keyof typeof INDEX_ITEM_KINDS];

/** Logical key shared by every item in the unified index table. */
export type IndexTableKey = {
  [INDEX_TABLE_PARTITION_KEY]: string;
  [INDEX_TABLE_SORT_KEY]: string;
};

/** Scalar identity types supported by Voltra index keys. */
export type IndexScalarIdentity = string | number;

const FLOAT_SIGN_BIT = 0x8000000000000000n;
const FLOAT_MASK = 0xffffffffffffffffn;

/** Encode a finite IEEE-754 value so lexical byte order equals numeric order. */
export function encodeSortableIndexNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("Structured numeric index values must be finite.");
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, normalized, false);
  const bits = view.getBigUint64(0, false);
  const ordered =
    bits & FLOAT_SIGN_BIT ? ~bits & FLOAT_MASK : bits ^ FLOAT_SIGN_BIT;
  return ordered.toString(16).padStart(16, "0");
}

/**
 * Encode a structured range value according to its persisted comparison
 * contract: numbers compare numerically; every other supported value compares
 * as its string representation using UTF-8 byte order.
 */
export function encodeSortableIndexValue(value: WhereValue): string {
  return typeof value === "number"
    ? `${INDEX_KEY_PARTS.number}${INDEX_KEY_SEPARATOR}${encodeSortableIndexNumber(value)}`
    : `${INDEX_KEY_PARTS.string}${INDEX_KEY_SEPARATOR}${encodeUtf8Hex(String(value))}`;
}

/** Collision-safe identity encoding for exact structured values. */
export function encodeExactIndexValue(value: WhereValue): string {
  if (typeof value === "number") {
    return `${INDEX_KEY_PARTS.number}${INDEX_KEY_SEPARATOR}${encodeIndexIdentity(String(value))}`;
  }
  if (value === null) {
    return `${INDEX_KEY_PARTS.null}${INDEX_KEY_SEPARATOR}`;
  }
  if (typeof value === "boolean") {
    return `${INDEX_KEY_PARTS.boolean}${INDEX_KEY_SEPARATOR}${value ? "1" : "0"}`;
  }
  return `${INDEX_KEY_PARTS.string}${INDEX_KEY_SEPARATOR}${encodeIndexIdentity(String(value))}`;
}

/** Build a deterministic document member sort key. */
export function buildIndexDocumentSortKey(docId: DocId): string {
  return assertIndexSortKey(
    `${INDEX_KEY_PARTS.document}${INDEX_KEY_SEPARATOR}${encodeIndexScalarIdentity(docId)}`,
  );
}

/** Recover the typed document identity from a document member sort key. */
export function decodeIndexDocumentSortKey(sortKey: string): DocId {
  const prefix = `${INDEX_KEY_PARTS.document}${INDEX_KEY_SEPARATOR}`;
  if (!sortKey.startsWith(prefix)) {
    throw new Error("Invalid index document sort key.");
  }
  return decodeIndexScalarIdentity(sortKey.slice(prefix.length));
}
