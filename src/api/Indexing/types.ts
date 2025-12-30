/**
 * Document identifier type used in indexes and cursors.
 */
export type DocId = string | number;

/**
 * Generic document record stored in the index.
 */
export type DocumentRecord = Record<string, unknown>;

/**
 * Reader interface for lossy postings lists.
 */
export type LossyReader = {
  /**
   * Load lossy postings for a token.
   * @param token Token to load postings for.
   * @param indexField Field name the token was indexed under.
   * @returns Array of document ids containing the token.
   */
  loadLossyPostings(token: string, indexField: string): Promise<DocId[]>;
};

/**
 * Page of lossy postings for paging-capable backends.
 */
export type LossyPostingsPage = {
  /**
   * Document ids in the page.
   */
  docIds: DocId[];
  /**
   * Doc id used to resume paging, if more results exist.
   */
  lastEvaluatedDocId?: DocId;
};

/**
 * Options for paging through lossy postings.
 */
export type LossyPostingsPageOptions = {
  /**
   * Exclusive starting doc id for paging.
   */
  exclusiveStartDocId?: DocId;
  /**
   * Maximum number of doc ids to return.
   */
  limit?: number;
};

/**
 * Reader interface that supports paging through lossy postings.
 */
export type LossyPagingReader = {
  /**
   * Query a page of lossy postings for a token.
   * @param token Token to query postings for.
   * @param indexField Field name the token was indexed under.
   * @param options Paging options for the query.
   * @returns Postings page for the token.
   */
  queryLossyPostingsPage(
    token: string,
    indexField: string,
    options?: LossyPostingsPageOptions,
  ): Promise<LossyPostingsPage>;
};

/**
 * Key used to address a token within a document and field.
 */
export type DocTokenKey = {
  /**
   * Document id containing the token.
   */
  docId: DocId;
  /**
   * Field name the token was indexed under.
   */
  indexField: string;
  /**
   * Token value.
   */
  token: string;
};

/**
 * Reader interface for checking token existence in documents.
 */
export type DocTokenReader = {
  /**
   * Check if a document has a specific token.
   * @param docId Document id to check.
   * @param indexField Field name the token was indexed under.
   * @param token Token value to check.
   * @returns True when the token exists for the document.
   */
  hasDocToken(docId: DocId, indexField: string, token: string): Promise<boolean>;
};

/**
 * Batch reader interface for checking token existence.
 */
export type DocTokenBatchReader = {
  /**
   * Batch check document token existence.
   * @param keys Token keys to check.
   * @returns Array of booleans aligned with the input keys.
   */
  batchHasDocTokens(keys: DocTokenKey[]): Promise<boolean[]>;
};

/**
 * Reader interface for exact token positions.
 */
export type ExactReader = {
  /**
   * Load exact positions for a token in a document.
   * @param token Token to load positions for.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Positions array or undefined if not present.
   */
  loadExactPositions(token: string, indexField: string, docId: DocId): Promise<number[] | undefined>;
};

/**
 * Batch reader interface for exact token positions.
 */
export type ExactBatchReader = {
  /**
   * Batch load exact positions for token keys.
   * @param keys Token keys to load positions for.
   * @returns Positions arrays aligned with the input keys.
   */
  batchLoadExactPositions(keys: DocTokenKey[]): Promise<(number[] | undefined)[]>;
};

/**
 * Token statistics stored with the index.
 */
export type TokenStats = {
  /**
   * Document frequency for the token.
   */
  df?: number;
  /**
   * Optional stats version for planner compatibility.
   */
  version?: number;
};

/**
 * Reader interface for token statistics.
 */
export type TokenStatsReader = {
  /**
   * Load token statistics for a token.
   * @param token Token to load stats for.
   * @param indexField Field name the token was indexed under.
   * @returns Token stats or undefined when missing.
   */
  loadTokenStats(token: string, indexField: string): Promise<TokenStats | undefined>;
};

/**
 * Combined reader interface for lossy, exact, and stats operations.
 */
export type IndexReader = LossyReader & ExactReader & TokenStatsReader & Partial<ExactBatchReader>;

/**
 * Writer interface for lossy postings.
 */
export type LossyWriter = {
  /**
   * Add a lossy posting for a token.
   * @param token Token to add.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id to associate.
   * @returns Promise resolved when the posting is written.
   */
  addLossyPosting(token: string, indexField: string, docId: DocId): Promise<void>;
  /**
   * Remove a lossy posting for a token.
   * @param token Token to remove.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id to disassociate.
   * @returns Promise resolved when the posting is removed.
   */
  removeLossyPosting(token: string, indexField: string, docId: DocId): Promise<void>;
};

/**
 * Writer interface for exact token positions.
 */
export type ExactWriter = {
  /**
   * Add exact token positions for a document.
   * @param token Token to add.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id to associate.
   * @param positions Token positions within the document.
   * @returns Promise resolved when positions are written.
   */
  addExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
    positions: number[],
  ): Promise<void>;
  /**
   * Remove exact token positions for a document.
   * @param token Token to remove.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id to disassociate.
   * @returns Promise resolved when positions are removed.
   */
  removeExactPositions(token: string, indexField: string, docId: DocId): Promise<void>;
};

/**
 * Combined writer interface for lossy and exact indexing.
 */
export type IndexWriter = LossyWriter & ExactWriter;

/**
 * Full index backend interface for reading and writing.
 */
export type IndexBackend = IndexReader & IndexWriter;
