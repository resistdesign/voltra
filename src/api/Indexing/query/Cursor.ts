import type { IndexOrderBy } from "./Types";
import {
  IndexQueryError,
  IndexQueryErrorCode,
  type IndexSearchLimits,
} from "./Types";

/** Version of the only public indexed-query cursor format. */
export const INDEX_SEARCH_CURSOR_VERSION = 1;

/** Compact continuation envelope for a deterministic materialized plan. */
export type IndexSearchCursorEnvelope = {
  version: typeof INDEX_SEARCH_CURSOR_VERSION;
  queryFingerprint: string;
  planFingerprint: string;
  order?: IndexOrderBy;
  offset: number;
};

const encodeBase64Url = (value: string): string => {
  const binary = encodeURIComponent(value).replace(
    /%([0-9A-F]{2})/g,
    (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const decodeBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  return decodeURIComponent(
    Array.from(binary)
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join(""),
  );
};

/** Deterministic JSON serialization used for expression and plan identity. */
export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

/** Small deterministic fingerprint; identity protection, not cryptography. */
export const fingerprintIndexQuery = (value: unknown): string => {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

/** Encode a bounded unified cursor envelope. */
export const encodeIndexSearchCursor = (
  cursor: IndexSearchCursorEnvelope,
  limits: IndexSearchLimits,
): string => {
  const encoded = encodeBase64Url(stableStringify(cursor));
  if (encoded.length > limits.maxCursorBytes) {
    throw new IndexQueryError(
      IndexQueryErrorCode.BUDGET_EXCEEDED,
      "Indexed-query cursor exceeds the configured payload budget.",
    );
  }
  return encoded;
};

/** Decode and structurally validate the unified cursor envelope. */
export const decodeIndexSearchCursor = (
  cursor: string | undefined,
  limits: IndexSearchLimits,
): IndexSearchCursorEnvelope | undefined => {
  if (!cursor) {
    return undefined;
  }
  if (cursor.length > limits.maxCursorBytes) {
    throw new IndexQueryError(
      IndexQueryErrorCode.INVALID_CURSOR,
      "Indexed-query cursor exceeds the configured payload budget.",
    );
  }
  try {
    const parsed = JSON.parse(
      decodeBase64Url(cursor),
    ) as IndexSearchCursorEnvelope;
    if (
      parsed.version !== INDEX_SEARCH_CURSOR_VERSION ||
      typeof parsed.queryFingerprint !== "string" ||
      typeof parsed.planFingerprint !== "string" ||
      !Number.isSafeInteger(parsed.offset) ||
      parsed.offset < 0
    ) {
      throw new Error();
    }
    return parsed;
  } catch (_error) {
    throw new IndexQueryError(
      IndexQueryErrorCode.INVALID_CURSOR,
      "Invalid indexed-query cursor.",
    );
  }
};
