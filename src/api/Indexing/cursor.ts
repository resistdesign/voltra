import type { DocId } from "./types.js";

/**
 * The supported ordering strategy for cursors.
 * */
export type SortingStrategy = "docIdAsc";

/**
 * Cursor planner metadata used to resume searches efficiently.
 * */
export type PlannerMetadata = {
  /**
   * Token selected as the primary postings list for paging.
   */
  primaryToken: string;
  /**
   * Optional token stats version used to validate planner choice.
   */
  statsVersion?: number;
  /**
   * Sorting strategy applied to doc id traversal.
   */
  sorting?: SortingStrategy;
};

/**
 * Cursor state for lossy search pagination.
 * */
export type LossyCursorState = {
  /**
   * Last document id returned in the previous page.
   */
  lastDocId?: DocId;
  /**
   * Planner metadata used to resume efficient paging.
   */
  plan?: PlannerMetadata;
};

/**
 * Cursor state for exact search pagination, including lossy and verification phases.
 * */
export type ExactCursorState = {
  /**
   * Lossy phase cursor state for candidate retrieval.
   */
  lossy?: LossyCursorState;
  /**
   * Verification phase cursor state for exact phrase checks.
   */
  verification?: {
    /**
     * Last verified document id in the verification phase.
     */
    lastDocId?: DocId;
    /**
     * Pending candidates to continue verifying.
     */
    pendingCandidates?: DocId[];
    /**
     * Offset into the pending candidates list.
     */
    pendingOffset?: number;
  };
  /**
   * Planner metadata used to resume efficient paging.
   */
  plan?: PlannerMetadata;
};

type PlannerPayload = {
  p?: string;
  sv?: number;
  s?: SortingStrategy;
};

type LossyCursorPayloadV1 = {
  v: 1;
  t: "lossy";
  lastDocId?: string | number;
};

type LossyCursorPayloadV2 = {
  v: 2;
  t: "lossy";
  lastDocId?: string | number;
  plan?: PlannerPayload;
};

type LossyCursorPayloadV3 = {
  v: 3;
  t: "lossy";
  lastDocId?: string | number;
  plan?: PlannerPayload;
};

type ExactCursorPayloadV1 = {
  v: 1;
  t: "exact";
  lossyLastDocId?: string | number;
  verificationLastDocId?: string | number;
};

type ExactCursorPayloadV2 = {
  v: 2;
  t: "exact";
  lossyLastDocId?: string | number;
  verificationLastDocId?: string | number;
  plan?: PlannerPayload;
};

type ExactCursorPayloadV3 = {
  v: 3;
  t: "exact";
  lossyLastDocId?: string | number;
  verificationLastDocId?: string | number;
  verificationPending?: Array<string | number>;
  verificationOffset?: number;
  plan?: PlannerPayload;
};

type LossyCursorPayload =
  | LossyCursorPayloadV1
  | LossyCursorPayloadV2
  | LossyCursorPayloadV3;
type ExactCursorPayload =
  | ExactCursorPayloadV1
  | ExactCursorPayloadV2
  | ExactCursorPayloadV3;
type CursorPayload = LossyCursorPayload | ExactCursorPayload;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const utf8ToBase64 = (input: string): string => {
  const bytes = textEncoder.encode(input);
  const bin = String.fromCharCode(...bytes);
  return btoa(bin);
};

const base64ToUtf8 = (input: string): string => {
  const bin = atob(input);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return textDecoder.decode(bytes);
};

function encodeCursor(payload: CursorPayload): string {
  return utf8ToBase64(JSON.stringify(payload));
}

function decodeCursor(cursor: string): CursorPayload {
  const base64 = cursor.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );

  let decoded: string;

  try {
    decoded = base64ToUtf8(padded);
  } catch (error) {
    throw new Error("Invalid cursor encoding.");
  }

  try {
    return JSON.parse(decoded) as CursorPayload;
  } catch (error) {
    throw new Error("Invalid cursor payload.");
  }
}

function encodePayload(payload: CursorPayload): string {
  return encodeCursor(payload);
}

function decodePayload(cursor: string): CursorPayload {
  const parsed = decodeCursor(cursor);

  if (
    (parsed.v !== 1 && parsed.v !== 2 && parsed.v !== 3) ||
    (parsed.t !== "lossy" && parsed.t !== "exact")
  ) {
    throw new Error("Unsupported cursor payload.");
  }

  return parsed;
}

function encodePlanner(plan?: PlannerMetadata): PlannerPayload | undefined {
  if (!plan) {
    return undefined;
  }

  return { p: plan.primaryToken, sv: plan.statsVersion, s: plan.sorting };
}

function decodePlanner(payload?: PlannerPayload): PlannerMetadata | undefined {
  if (!payload?.p) {
    return undefined;
  }

  return {
    primaryToken: payload.p,
    statsVersion: payload.sv,
    sorting: payload.s ?? "docIdAsc",
  };
}

function normalizeDocId(value: string | number | undefined): DocId | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value);
}

function normalizeDocIdList(
  values?: Array<string | number>,
): DocId[] | undefined {
  if (!values) {
    return undefined;
  }

  return values.map((value) => String(value));
}

/**
 * Encode a lossy cursor state into a URL-safe string.
 * @returns URL-safe cursor string, or undefined when there is no state to encode.
 * */
export function encodeLossyCursor(
  /**
   * Lossy cursor state to encode.
   */
  state?: LossyCursorState,
): string | undefined {
  if (!state || (state.lastDocId === undefined && !state.plan)) {
    return undefined;
  }

  const plan = encodePlanner(state.plan);

  if (!plan) {
    return encodePayload({ v: 1, t: "lossy", lastDocId: state.lastDocId });
  }

  return encodePayload({
    v: 3,
    t: "lossy",
    lastDocId: state.lastDocId,
    plan,
  });
}

/**
 * Decode a lossy cursor string back into state.
 * @returns Parsed lossy cursor state, or undefined when cursor is missing.
 * */
export function decodeLossyCursor(
  /**
   * Cursor string to decode.
   */
  cursor?: string,
): LossyCursorState | undefined {
  if (!cursor) {
    return undefined;
  }

  const payload = decodePayload(cursor);

  if (payload.t !== "lossy") {
    throw new Error("Expected lossy cursor payload.");
  }

  return {
    lastDocId: normalizeDocId(payload.lastDocId),
    plan: decodePlanner((payload as LossyCursorPayloadV2).plan),
  };
}

/**
 * Encode an exact cursor state into a URL-safe string.
 * @returns URL-safe cursor string, or undefined when there is no state to encode.
 * */
export function encodeExactCursor(
  /**
   * Exact cursor state to encode.
   */
  state?: ExactCursorState,
): string | undefined {
  if (!state) {
    return undefined;
  }

  const lossyLastDocId = state.lossy?.lastDocId;
  const verificationLastDocId = state.verification?.lastDocId;
  const verificationPending = state.verification?.pendingCandidates;
  const verificationOffset = state.verification?.pendingOffset;

  if (
    lossyLastDocId === undefined &&
    verificationLastDocId === undefined &&
    verificationPending === undefined &&
    verificationOffset === undefined &&
    !state.plan
  ) {
    return undefined;
  }

  const plan = encodePlanner(state.plan);

  if (
    !plan &&
    verificationPending === undefined &&
    verificationOffset === undefined
  ) {
    return encodePayload({
      v: 1,
      t: "exact",
      lossyLastDocId,
      verificationLastDocId,
    });
  }

  return encodePayload({
    v: 3,
    t: "exact",
    lossyLastDocId,
    verificationLastDocId,
    verificationPending,
    verificationOffset,
    plan,
  });
}

/**
 * Decode an exact cursor string back into state.
 * @returns Parsed exact cursor state, or undefined when cursor is missing.
 * */
export function decodeExactCursor(
  /**
   * Cursor string to decode.
   */
  cursor?: string,
): ExactCursorState | undefined {
  if (!cursor) {
    return undefined;
  }

  const payload = decodePayload(cursor);

  if (payload.t !== "exact") {
    throw new Error("Expected exact cursor payload.");
  }

  const payloadV3 = payload as ExactCursorPayloadV3;

  const normalizedVerificationPending = normalizeDocIdList(
    payloadV3.verificationPending,
  );

  return {
    lossy:
      payload.lossyLastDocId === undefined
        ? undefined
        : { lastDocId: normalizeDocId(payload.lossyLastDocId) },
    verification:
      payload.verificationLastDocId === undefined
        ? normalizedVerificationPending ||
          payloadV3.verificationOffset !== undefined
          ? {
              pendingCandidates: normalizedVerificationPending,
              pendingOffset: payloadV3.verificationOffset,
            }
          : undefined
        : {
            lastDocId: normalizeDocId(payload.verificationLastDocId),
            pendingCandidates: normalizedVerificationPending,
            pendingOffset: payloadV3.verificationOffset,
          },
    plan: decodePlanner((payload as ExactCursorPayloadV2).plan),
  };
}
