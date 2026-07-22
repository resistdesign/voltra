/**
 * @packageDocumentation
 *
 * Public schema and key factories for Voltra's unified indexing table.
 * Callers provide semantic identities; this module exclusively owns physical
 * separators, namespaces, encoding, and key-size validation.
 */
import type { DocId } from "./Types";
import type { WhereValue } from "./structured/Types";

/** Physical partition-key attribute used by every unified index item. */
export const INDEX_TABLE_PARTITION_KEY = "pk";
/** Physical sort-key attribute used by every unified index item. */
export const INDEX_TABLE_SORT_KEY = "sk";
/** Physical item-kind attribute used for diagnostics and migrations. */
export const INDEX_TABLE_KIND_ATTRIBUTE = "kind";
/** Current physical key format version. */
export const INDEX_KEY_VERSION = "v1";
/** Separator reserved for Voltra-owned key structure. */
export const INDEX_KEY_SEPARATOR = "#";
/** Reusable semantic segments used inside partition and sort keys. */
export const INDEX_KEY_PARTS = {
  boolean: "b",
  document: "d",
  entity: "e",
  field: "f",
  number: "n",
  null: "z",
  position: "p",
  state: "state",
  string: "s",
  token: "t",
} as const;
/** DynamoDB partition-key maximum size in UTF-8 bytes. */
export const INDEX_PARTITION_KEY_MAX_BYTES = 2048;
/** DynamoDB sort-key maximum size in UTF-8 bytes. */
export const INDEX_SORT_KEY_MAX_BYTES = 1024;

/** Stable namespaces for every logical record family in the shared table. */
export const INDEX_ITEM_KINDS = {
  structuredTerm: "st",
  structuredRange: "sr",
  structuredDocument: "sd",
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

/** The one deployment-specific table required by all DynamoDB index backends. */
export type IndexTableConfig = {
  /** Name of the DynamoDB table with string `pk` and `sk` keys. */
  tableName: string;
};

/** Physical key shared by every item in the unified index table. */
export type IndexTableKey = {
  [INDEX_TABLE_PARTITION_KEY]: string;
  [INDEX_TABLE_SORT_KEY]: string;
};

/** Scalar identity types supported by Voltra index keys. */
export type IndexScalarIdentity = string | number;

const utf8Length = (value: string): number =>
  new TextEncoder().encode(value).length;

const assertWellFormedUnicode = (value: string): void => {
  try {
    encodeURIComponent(value);
  } catch (_error) {
    throw new Error("Index identities must contain well-formed Unicode.");
  }
};

/**
 * Encode one opaque identity segment. `encodeURIComponent` is used here—not
 * `encodeURI`—because URI structural characters such as `#`, `/`, and `?`
 * must never become Voltra key separators. Sortable values use a different
 * codec because URI escaping does not preserve value order.
 */
export function encodeIndexIdentity(value: string | number): string {
  const normalized = String(value);
  assertWellFormedUnicode(normalized);
  return encodeURIComponent(normalized);
}

/** Decode an identity segment produced by {@link encodeIndexIdentity}. */
export function decodeIndexIdentity(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    throw new Error("Invalid encoded index identity.");
  }
}

/**
 * Encode a scalar identity without collapsing numeric and string values.
 *
 * The type tag is part of the persisted identity: numeric `123` and string
 * `"123"` intentionally produce different keys. Numeric identities must be
 * finite; `-0` is normalized to `0` because JavaScript treats them as the same
 * map identity and DynamoDB cannot expose a useful distinction between them.
 */
export function encodeIndexScalarIdentity(value: IndexScalarIdentity): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Numeric index identities must be finite.");
    }
    const normalized = Object.is(value, -0) ? 0 : value;
    return `${INDEX_KEY_PARTS.number}${INDEX_KEY_SEPARATOR}${encodeIndexIdentity(normalized)}`;
  }

  return `${INDEX_KEY_PARTS.string}${INDEX_KEY_SEPARATOR}${encodeIndexIdentity(value)}`;
}

/** Decode a scalar identity produced by {@link encodeIndexScalarIdentity}. */
export function decodeIndexScalarIdentity(value: string): IndexScalarIdentity {
  const separatorIndex = value.indexOf(INDEX_KEY_SEPARATOR);
  if (separatorIndex < 0) {
    throw new Error("Invalid encoded scalar index identity.");
  }

  const tag = value.slice(0, separatorIndex);
  const decoded = decodeIndexIdentity(value.slice(separatorIndex + 1));

  if (tag === INDEX_KEY_PARTS.string) {
    return decoded;
  }
  if (tag === INDEX_KEY_PARTS.number) {
    const numeric = Number(decoded);
    if (
      !Number.isFinite(numeric) ||
      encodeIndexScalarIdentity(numeric) !== value
    ) {
      throw new Error("Invalid encoded numeric index identity.");
    }
    return numeric;
  }

  throw new Error("Invalid scalar index identity type tag.");
}

/** Join already semantic identity segments into a versioned physical key. */
export function buildIndexKey(
  kind: IndexItemKind,
  ...segments: string[]
): string {
  const key = [
    INDEX_KEY_VERSION,
    kind,
    ...segments.map(encodeIndexIdentity),
  ].join(INDEX_KEY_SEPARATOR);
  return assertIndexPartitionKey(key);
}

/**
 * Build a partition key whose first semantic identity is a typed scalar.
 * Use this for document/entity-owned partitions instead of passing an id to
 * {@link buildIndexKey}, which intentionally treats ordinary segments as
 * untyped opaque strings.
 */
export function buildIndexScalarKey(
  kind: IndexItemKind,
  scope: "document" | "entity",
  identity: IndexScalarIdentity,
  ...segments: string[]
): string {
  const scopePart =
    scope === "document" ? INDEX_KEY_PARTS.document : INDEX_KEY_PARTS.entity;
  const key = [
    INDEX_KEY_VERSION,
    kind,
    scopePart,
    encodeIndexScalarIdentity(identity),
    ...segments.map(encodeIndexIdentity),
  ].join(INDEX_KEY_SEPARATOR);
  return assertIndexPartitionKey(key);
}

/** Assert a deployment supplied a usable unified table name. */
export function assertIndexTableConfig(config: IndexTableConfig): void {
  if (typeof config?.tableName !== "string" || config.tableName.trim() === "") {
    throw new Error("Missing table name for indexing.tableName.");
  }
}

/** Validate a complete physical key against DynamoDB's key byte limits. */
export function assertIndexTableKey(key: IndexTableKey): IndexTableKey {
  assertIndexPartitionKey(key.pk);
  assertIndexSortKey(key.sk);
  return key;
}

/** Validate a physical partition key and return it unchanged. */
export function assertIndexPartitionKey(value: string): string {
  if (utf8Length(value) > INDEX_PARTITION_KEY_MAX_BYTES) {
    throw new Error(
      `Index partition key exceeds ${INDEX_PARTITION_KEY_MAX_BYTES} UTF-8 bytes.`,
    );
  }
  return value;
}

/** Validate a physical sort key and return it unchanged. */
export function assertIndexSortKey(value: string): string {
  if (utf8Length(value) > INDEX_SORT_KEY_MAX_BYTES) {
    throw new Error(
      `Index sort key exceeds ${INDEX_SORT_KEY_MAX_BYTES} UTF-8 bytes.`,
    );
  }
  return value;
}

const encodeUtf8Hex = (value: string): string =>
  Array.from(new TextEncoder().encode(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

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
