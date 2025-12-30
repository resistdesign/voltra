/**
 * @packageDocumentation
 *
 * DynamoDB schema constants and key encoders for fulltext tables.
 */
export const fullTextKeyPrefixes = {
  /**
   * Prefix for index field values.
   */
  field: 'f#',
  /**
   * Prefix for token values.
   */
  token: 't#',
  /**
   * Prefix for document ids.
   */
  doc: 'd#',
  /**
   * Prefix for token position values.
   */
  position: 'p#',
} as const;

/**
 * LossyPostings table
 * PK: f#{indexField}#t#{token}
 * SK: d#{docId}
 */
export const lossyPostingsSchema = {
  /**
   * DynamoDB table name for lossy postings.
   */
  tableName: 'LossyPostings',
  /**
   * Partition key attribute for lossy postings.
   */
  partitionKey: 'pk',
  /**
   * Sort key attribute for lossy postings.
   */
  sortKey: 'sk',
} as const;

/**
 * ExactPostings table
 * PK: f#{indexField}#t#{token}
 * SK: d#{docId}
 */
export const exactPostingsSchema = {
  /**
   * DynamoDB table name for exact postings.
   */
  tableName: 'ExactPostings',
  /**
   * Partition key attribute for exact postings.
   */
  partitionKey: 'pk',
  /**
   * Sort key attribute for exact postings.
   */
  sortKey: 'sk',
  /**
   * Attribute name holding position arrays.
   */
  positionsAttribute: 'positions',
} as const;

/**
 * Optional FullTextDocMirror table
 * PK: d#{docId}
 */
export const fullTextDocMirrorSchema = {
  /**
   * DynamoDB table name for document mirrors.
   */
  tableName: 'FullTextDocMirror',
  /**
   * Partition key attribute for document mirrors.
   */
  partitionKey: 'pk',
  /**
   * Attribute name for stored normalized content.
   */
  contentAttribute: 'content',
} as const;

/**
 * FullTextTokenStats table
 * PK: f#{indexField}#t#{token}
 */
export const fullTextTokenStatsSchema = {
  /**
   * DynamoDB table name for token stats.
   */
  tableName: 'FullTextTokenStats',
  /**
   * Partition key attribute for token stats.
   */
  partitionKey: 'pk',
  /**
   * Attribute name for document frequency values.
   */
  documentFrequencyAttribute: 'df',
} as const;

/**
 * Optional DocTokens table
 * PK: d#{docId}
 * SK: f#{indexField}#t#{token}
 */
export const docTokensSchema = {
  /**
   * DynamoDB table name for doc token membership.
   */
  tableName: 'DocTokens',
  /**
   * Partition key attribute for doc token membership.
   */
  partitionKey: 'pk',
  /**
   * Sort key attribute for doc token membership.
   */
  sortKey: 'sk',
} as const;

/**
 * Optional DocTokenPositions table
 * PK: d#{docId}
 * SK: f#{indexField}#t#{token}
 */
export const docTokenPositionsSchema = {
  /**
   * DynamoDB table name for doc token positions.
   */
  tableName: 'DocTokenPositions',
  /**
   * Partition key attribute for doc token positions.
   */
  partitionKey: 'pk',
  /**
   * Sort key attribute for doc token positions.
   */
  sortKey: 'sk',
  /**
   * Attribute name holding position arrays.
   */
  positionsAttribute: 'positions',
} as const;

/**
 * Encode a token key for token-based tables.
 * @param indexField Field name the token was indexed under.
 * @param token Token value.
 * @returns Encoded token key.
 */
export function encodeTokenKey(indexField: string, token: string): string {
  return `${fullTextKeyPrefixes.field}${indexField}#${fullTextKeyPrefixes.token}${token}`;
}

/**
 * Encode a document key for document-based tables.
 * @param docId Document id to encode.
 * @returns Encoded document key.
 */
export function encodeDocKey(docId: string | number): string {
  return `${fullTextKeyPrefixes.doc}${docId}`;
}

/**
 * Encode the key used for the document mirror table.
 * @param indexField Field name the document was indexed under.
 * @param docId Document id to encode.
 * @returns Encoded document mirror key.
 */
export function encodeDocMirrorKey(indexField: string | number, docId: string | number): string {
  return `${encodeDocKey(docId.toString())}#${fullTextKeyPrefixes.field}${indexField}`;
}

/**
 * Encode sort key for token-to-document tables.
 * @param docId Document id to encode.
 * @returns Encoded sort key for token docs.
 */
export function encodeTokenDocSortKey(docId: string | number): string {
  return encodeDocKey(docId);
}

/**
 * Encode sort key for document-to-token tables.
 * @param indexField Field name the token was indexed under.
 * @param token Token value.
 * @returns Encoded sort key for doc tokens.
 */
export function encodeDocTokenSortKey(indexField: string, token: string): string {
  return encodeTokenKey(indexField, token);
}

/**
 * Encode sort key for token positions within a document.
 * @param indexField Field name the token was indexed under.
 * @param token Token value.
 * @param position Token position within the document.
 * @returns Encoded sort key for token positions.
 */
export function encodeDocTokenPositionSortKey(
  indexField: string,
  token: string,
  position: number,
): string {
  return `${encodeTokenKey(indexField, token)}#${fullTextKeyPrefixes.position}${position}`;
}
