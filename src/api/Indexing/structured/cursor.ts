import type { DocId } from '../types.js';

export type StructuredCursorState = {
  lastDocId?: DocId;
  backendToken?: string;
};

type StructuredCursorPayload = {
  v: 1;
  lastDocId?: string | number;
  backendToken?: string;
};

function encodeBase64Url(value: string): string {
  const binary = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const encoded = Array.from(binary)
    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
    .join('');
  return decodeURIComponent(encoded);
}

function encodePayload(payload: StructuredCursorPayload): string {
  return encodeBase64Url(JSON.stringify(payload));
}

function decodePayload(cursor: string): StructuredCursorPayload {
  const parsed = JSON.parse(decodeBase64Url(cursor)) as StructuredCursorPayload;

  if (parsed.v !== 1) {
    throw new Error('Unsupported cursor payload.');
  }

  return parsed;
}

export function encodeStructuredCursor(state?: StructuredCursorState): string | undefined {
  if (!state) {
    return undefined;
  }

  const { lastDocId, backendToken } = state;

  if (lastDocId === undefined && backendToken === undefined) {
    return undefined;
  }

  return encodePayload({ v: 1, lastDocId, backendToken });
}

export function decodeStructuredCursor(cursor?: string): StructuredCursorState | undefined {
  if (!cursor) {
    return undefined;
  }

  const payload = decodePayload(cursor);

  return {
    lastDocId: payload.lastDocId === undefined ? undefined : String(payload.lastDocId),
    backendToken: payload.backendToken,
  };
}
