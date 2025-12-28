export const fullTextKeyPrefixes = {
  field: 'f#',
  token: 't#',
  doc: 'd#',
  position: 'p#',
} as const;

/**
 * LossyPostings table
 * PK: f#{indexField}#t#{token}
 * SK: d#{docId}
 */
export const lossyPostingsSchema = {
  tableName: 'LossyPostings',
  partitionKey: 'pk',
  sortKey: 'sk',
} as const;

/**
 * ExactPostings table
 * PK: f#{indexField}#t#{token}
 * SK: d#{docId}
 */
export const exactPostingsSchema = {
  tableName: 'ExactPostings',
  partitionKey: 'pk',
  sortKey: 'sk',
  positionsAttribute: 'positions',
} as const;

/**
 * Optional FullTextDocMirror table
 * PK: d#{docId}
 */
export const fullTextDocMirrorSchema = {
  tableName: 'FullTextDocMirror',
  partitionKey: 'pk',
  contentAttribute: 'content',
} as const;

/**
 * FullTextTokenStats table
 * PK: f#{indexField}#t#{token}
 */
export const fullTextTokenStatsSchema = {
  tableName: 'FullTextTokenStats',
  partitionKey: 'pk',
  documentFrequencyAttribute: 'df',
} as const;

/**
 * Optional DocTokens table
 * PK: d#{docId}
 * SK: f#{indexField}#t#{token}
 */
export const docTokensSchema = {
  tableName: 'DocTokens',
  partitionKey: 'pk',
  sortKey: 'sk',
} as const;

/**
 * Optional DocTokenPositions table
 * PK: d#{docId}
 * SK: f#{indexField}#t#{token}
 */
export const docTokenPositionsSchema = {
  tableName: 'DocTokenPositions',
  partitionKey: 'pk',
  sortKey: 'sk',
  positionsAttribute: 'positions',
} as const;

export function encodeTokenKey(indexField: string, token: string): string {
  return `${fullTextKeyPrefixes.field}${indexField}#${fullTextKeyPrefixes.token}${token}`;
}

export function encodeDocKey(docId: string | number): string {
  return `${fullTextKeyPrefixes.doc}${docId}`;
}

export function encodeDocMirrorKey(indexField: string | number, docId: string | number): string {
  return `${encodeDocKey(docId.toString())}#${fullTextKeyPrefixes.field}${indexField}`;
}

export function encodeTokenDocSortKey(docId: string | number): string {
  return encodeDocKey(docId);
}

export function encodeDocTokenSortKey(indexField: string, token: string): string {
  return encodeTokenKey(indexField, token);
}

export function encodeDocTokenPositionSortKey(
  indexField: string,
  token: string,
  position: number,
): string {
  return `${encodeTokenKey(indexField, token)}#${fullTextKeyPrefixes.position}${position}`;
}
