import type { DocId } from "../Types";

/** Cursor for one deterministic candidate source. */
export type StructuredIndexHitCursor = {
  /** Backend continuation after the last fully consumed page; null is terminal. */
  next: string | null;
};

/** Bounded structured-search composition state. */
export type StructuredSearchCursorState = {
  /** Baseline deterministic candidate-source cursor. */
  mode?: "baseline";
  /** Positional cursor prefix for sources that have started or completed. */
  hits: StructuredIndexHitCursor[];
  /** Current deterministic source position. */
  sourceIndex: number;
  /** Qualified overflow produced by the last atomically consumed page. */
  readyDocIds: DocId[];
};

/** Cursor for Link & Lock ordered occupancy traversal. */
export type StructuredOccupancyCursorState = {
  mode: "occupancy";
  /** Occupancy generation used to build the deterministic token plan. */
  generation: string;
  /** Present sort tokens are always exhausted before missing values. */
  phase: "present" | "missing";
  /** Current/exhausted exact sort-token boundary. */
  sortToken?: string;
  /** Backend continuation while consuming one token or missing stream. */
  blockCursor?: string;
};

/** All structured search cursor formats accepted by the current codec. */
export type AnyStructuredSearchCursorState =
  StructuredSearchCursorState | StructuredOccupancyCursorState;

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
  state: AnyStructuredSearchCursorState,
): string => encodeBase64Url(JSON.stringify(state));

/** Decode and minimally validate structured composition state. */
export const decodeStructuredSearchCursor = (
  cursor?: string,
): AnyStructuredSearchCursorState | undefined => {
  if (!cursor) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(
      decodeBase64Url(cursor),
    ) as AnyStructuredSearchCursorState;
    if (parsed?.mode === "occupancy") {
      if (
        typeof parsed.generation !== "string" ||
        (parsed.phase !== "present" && parsed.phase !== "missing") ||
        (parsed.sortToken !== undefined &&
          typeof parsed.sortToken !== "string") ||
        (parsed.blockCursor !== undefined &&
          typeof parsed.blockCursor !== "string")
      ) {
        throw new Error("Invalid structured occupancy cursor.");
      }
      return parsed;
    }
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
