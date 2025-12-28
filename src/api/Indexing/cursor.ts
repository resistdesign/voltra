import type { DocId } from './types.js';

export type SortingStrategy = 'docIdAsc';

export type PlannerMetadata = {
  primaryToken: string;
  statsVersion?: number;
  sorting?: SortingStrategy;
};

export type LossyCursorState = {
  lastDocId?: DocId;
  plan?: PlannerMetadata;
};

export type ExactCursorState = {
  lossy?: LossyCursorState;
  verification?: {
    lastDocId?: DocId;
    pendingCandidates?: DocId[];
    pendingOffset?: number;
  };
  plan?: PlannerMetadata;
};

type PlannerPayload = {
  p?: string;
  sv?: number;
  s?: SortingStrategy;
};

type LossyCursorPayloadV1 = {
  v: 1;
  t: 'lossy';
  lastDocId?: string | number;
};

type LossyCursorPayloadV2 = {
  v: 2;
  t: 'lossy';
  lastDocId?: string | number;
  plan?: PlannerPayload;
};

type LossyCursorPayloadV3 = {
  v: 3;
  t: 'lossy';
  lastDocId?: string | number;
  plan?: PlannerPayload;
};

type ExactCursorPayloadV1 = {
  v: 1;
  t: 'exact';
  lossyLastDocId?: string | number;
  verificationLastDocId?: string | number;
};

type ExactCursorPayloadV2 = {
  v: 2;
  t: 'exact';
  lossyLastDocId?: string | number;
  verificationLastDocId?: string | number;
  plan?: PlannerPayload;
};

type ExactCursorPayloadV3 = {
  v: 3;
  t: 'exact';
  lossyLastDocId?: string | number;
  verificationLastDocId?: string | number;
  verificationPending?: Array<string | number>;
  verificationOffset?: number;
  plan?: PlannerPayload;
};

type LossyCursorPayload = LossyCursorPayloadV1 | LossyCursorPayloadV2 | LossyCursorPayloadV3;
type ExactCursorPayload = ExactCursorPayloadV1 | ExactCursorPayloadV2 | ExactCursorPayloadV3;
type CursorPayload = LossyCursorPayload | ExactCursorPayload;

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload {
  const base64 = cursor.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  let decoded: string;
  try {
    decoded = Buffer.from(padded, 'base64').toString('utf8');
  } catch (error) {
    throw new Error('Invalid cursor encoding.');
  }

  try {
    return JSON.parse(decoded) as CursorPayload;
  } catch (error) {
    throw new Error('Invalid cursor payload.');
  }
}

function encodePayload(payload: CursorPayload): string {
  return encodeCursor(payload);
}

function decodePayload(cursor: string): CursorPayload {
  const parsed = decodeCursor(cursor);

  if (
    (parsed.v !== 1 && parsed.v !== 2 && parsed.v !== 3) ||
    (parsed.t !== 'lossy' && parsed.t !== 'exact')
  ) {
    throw new Error('Unsupported cursor payload.');
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

  return { primaryToken: payload.p, statsVersion: payload.sv, sorting: payload.s ?? 'docIdAsc' };
}

function normalizeDocId(value: string | number | undefined): DocId | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value);
}

function normalizeDocIdList(values?: Array<string | number>): DocId[] | undefined {
  if (!values) {
    return undefined;
  }

  return values.map((value) => String(value));
}

export function encodeLossyCursor(state?: LossyCursorState): string | undefined {
  if (!state || (state.lastDocId === undefined && !state.plan)) {
    return undefined;
  }

  const plan = encodePlanner(state.plan);

  if (!plan) {
    return encodePayload({ v: 1, t: 'lossy', lastDocId: state.lastDocId });
  }

  return encodePayload({
    v: 3,
    t: 'lossy',
    lastDocId: state.lastDocId,
    plan,
  });
}

export function decodeLossyCursor(cursor?: string): LossyCursorState | undefined {
  if (!cursor) {
    return undefined;
  }

  const payload = decodePayload(cursor);

  if (payload.t !== 'lossy') {
    throw new Error('Expected lossy cursor payload.');
  }

  return {
    lastDocId: normalizeDocId(payload.lastDocId),
    plan: decodePlanner((payload as LossyCursorPayloadV2).plan),
  };
}

export function encodeExactCursor(state?: ExactCursorState): string | undefined {
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

  if (!plan && verificationPending === undefined && verificationOffset === undefined) {
    return encodePayload({ v: 1, t: 'exact', lossyLastDocId, verificationLastDocId });
  }

  return encodePayload({
    v: 3,
    t: 'exact',
    lossyLastDocId,
    verificationLastDocId,
    verificationPending,
    verificationOffset,
    plan,
  });
}

export function decodeExactCursor(cursor?: string): ExactCursorState | undefined {
  if (!cursor) {
    return undefined;
  }

  const payload = decodePayload(cursor);

  if (payload.t !== 'exact') {
    throw new Error('Expected exact cursor payload.');
  }

  const payloadV3 = payload as ExactCursorPayloadV3;

  const normalizedVerificationPending = normalizeDocIdList(payloadV3.verificationPending);

  return {
    lossy:
      payload.lossyLastDocId === undefined
        ? undefined
        : { lastDocId: normalizeDocId(payload.lossyLastDocId) },
    verification:
      payload.verificationLastDocId === undefined
        ? normalizedVerificationPending || payloadV3.verificationOffset !== undefined
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
