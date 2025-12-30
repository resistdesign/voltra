/**
 * Cursor state for relational paging.
 */
export type RelationalCursorState = {
  /**
   * Last entity id processed in the previous page.
   */
  lastId?: string;
  /**
   * Backend continuation token used to resume paging.
   */
  continuationToken?: string;
};

type RelationalCursorPayload = {
  v: 1;
  t: 'rel';
  lastId?: string;
  continuationToken?: string;
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

function encodePayload(payload: RelationalCursorPayload): string {
  return encodeBase64Url(JSON.stringify(payload));
}

function decodePayload(cursor: string): RelationalCursorPayload {
  const parsed = JSON.parse(decodeBase64Url(cursor)) as RelationalCursorPayload;

  if (parsed.v !== 1 || parsed.t !== 'rel') {
    throw new Error('Unsupported relational cursor payload.');
  }

  return parsed;
}

/**
 * Encode relational cursor state into a URL-safe string.
 * @param state Cursor state to encode.
 * @returns URL-safe cursor string, or undefined when there is no state to encode.
 */
export function encodeRelationalCursor(
  state?: RelationalCursorState,
): string | undefined {
  if (!state) {
    return undefined;
  }

  const { lastId, continuationToken } = state;

  if (lastId === undefined && continuationToken === undefined) {
    return undefined;
  }

  return encodePayload({ v: 1, t: 'rel', lastId, continuationToken });
}

/**
 * Decode a relational cursor string back into state.
 * @param cursor Cursor string to decode.
 * @returns Parsed cursor state, or undefined when cursor is missing.
 */
export function decodeRelationalCursor(
  cursor?: string,
): RelationalCursorState | undefined {
  if (!cursor) {
    return undefined;
  }

  const payload = decodePayload(cursor);

  return { lastId: payload.lastId, continuationToken: payload.continuationToken };
}
