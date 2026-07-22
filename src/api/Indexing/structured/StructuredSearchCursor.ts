import type { DocId } from "../Types";

/** Cursor for one deterministic candidate source. */
export type StructuredIndexHitCursor = {
  /** Backend continuation after the last fully consumed page; null is terminal. */
  next: string | null;
};

/** Bounded structured-search composition state. */
export type StructuredSearchCursorState = {
  /** Positional cursor prefix for sources that have started or completed. */
  hits: StructuredIndexHitCursor[];
  /** Current deterministic source position. */
  sourceIndex: number;
  /** Qualified overflow produced by the last atomically consumed page. */
  readyDocIds: DocId[];
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

/** Encode structured composition state without query identity metadata. */
export const encodeStructuredSearchCursor = (
  state: StructuredSearchCursorState,
): string => encodeBase64Url(JSON.stringify(state));

/** Decode and minimally validate structured composition state. */
export const decodeStructuredSearchCursor = (
  cursor?: string,
): StructuredSearchCursorState | undefined => {
  if (!cursor) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(
      decodeBase64Url(cursor),
    ) as StructuredSearchCursorState;
    if (
      !parsed ||
      !Array.isArray(parsed.hits) ||
      !Array.isArray(parsed.readyDocIds) ||
      !Number.isInteger(parsed.sourceIndex) ||
      parsed.sourceIndex < 0 ||
      parsed.hits.some(
        (hit) => !hit || (hit.next !== null && typeof hit.next !== "string"),
      )
    ) {
      throw new Error("Invalid structured search cursor.");
    }
    return parsed;
  } catch (_error) {
    throw new Error("Invalid structured search cursor.");
  }
};
