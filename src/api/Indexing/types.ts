export type DocId = string | number;

export type DocumentRecord = Record<string, unknown>;

export type LossyReader = {
  loadLossyPostings(token: string, indexField: string): Promise<DocId[]>;
};

export type LossyPostingsPage = {
  docIds: DocId[];
  lastEvaluatedDocId?: DocId;
};

export type LossyPostingsPageOptions = {
  exclusiveStartDocId?: DocId;
  limit?: number;
};

export type LossyPagingReader = {
  queryLossyPostingsPage(
    token: string,
    indexField: string,
    options?: LossyPostingsPageOptions,
  ): Promise<LossyPostingsPage>;
};

export type DocTokenKey = {
  docId: DocId;
  indexField: string;
  token: string;
};

export type DocTokenReader = {
  hasDocToken(docId: DocId, indexField: string, token: string): Promise<boolean>;
};

export type DocTokenBatchReader = {
  batchHasDocTokens(keys: DocTokenKey[]): Promise<boolean[]>;
};

export type ExactReader = {
  loadExactPositions(token: string, indexField: string, docId: DocId): Promise<number[] | undefined>;
};

export type ExactBatchReader = {
  batchLoadExactPositions(keys: DocTokenKey[]): Promise<(number[] | undefined)[]>;
};

export type TokenStats = {
  df?: number;
  version?: number;
};

export type TokenStatsReader = {
  loadTokenStats(token: string, indexField: string): Promise<TokenStats | undefined>;
};

export type IndexReader = LossyReader & ExactReader & TokenStatsReader & Partial<ExactBatchReader>;

export type LossyWriter = {
  addLossyPosting(token: string, indexField: string, docId: DocId): Promise<void>;
  removeLossyPosting(token: string, indexField: string, docId: DocId): Promise<void>;
};

export type ExactWriter = {
  addExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
    positions: number[],
  ): Promise<void>;
  removeExactPositions(token: string, indexField: string, docId: DocId): Promise<void>;
};

export type IndexWriter = LossyWriter & ExactWriter;

export type IndexBackend = IndexReader & IndexWriter;
