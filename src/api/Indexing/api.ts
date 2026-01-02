/**
 * @packageDocumentation
 *
 * Facade functions for indexing documents and running lossy/exact search with
 * cursor support. Configure a default backend via {@link setIndexBackend}, or
 * pass a backend per call.
 *
 * Example:
 * ```ts
 * import { indexDocument, searchExact } from "./api";
 *
 * await indexDocument({ document: { id: "1", text: "hello world" }, primaryField: "id", indexField: "text", backend });
 * const results = await searchExact({ query: "\"hello world\"", indexField: "text", backend, limit: 10 });
 * ```
 */
import type { ExactCursorState, PlannerMetadata } from "./cursor";
import { decodeExactCursor, decodeLossyCursor, encodeExactCursor, encodeLossyCursor } from "./cursor";
import { tokenize, tokenizeLossyTrigrams } from "./tokenize";
import type {
  DocId,
  DocTokenBatchReader,
  DocTokenKey,
  DocTokenReader,
  DocumentRecord,
  IndexBackend,
  IndexReader,
  LossyPagingReader,
  LossyPostingsPageOptions,
  TokenStats,
} from "./types";
import { type ResolvedSearchLimits, SEARCH_DEFAULTS } from "./handler/config";
import type { SearchTrace } from "./trace";
import { createHash } from "./hash-universal";
import { compareDocId, normalizeDocId } from "./docId";

type TraceableIndexBackend = IndexBackend & { setActiveTrace(trace?: SearchTrace): void };

/**
 * Input for indexing a document.
 * */
export type IndexDocumentInput = {
  /**
   * Document record to index.
   */
  document: DocumentRecord;
  /**
   * Field name used as the document id.
   */
  primaryField: string;
  /**
   * Field name containing the text to index.
   */
  indexField: string;
  /**
   * Optional backend override (defaults to configured backend).
   */
  backend?: IndexBackend;
};

/**
 * Input for removing a document from the index.
 * */
export type RemoveDocumentInput = {
  /**
   * Document record to remove.
   */
  document: DocumentRecord;
  /**
   * Field name used as the document id.
   */
  primaryField: string;
  /**
   * Field name containing the text to remove from the index.
   */
  indexField: string;
  /**
   * Optional backend override (defaults to configured backend).
   */
  backend?: IndexBackend;
};

/**
 * Input for lossy search with paging support.
 * */
export type SearchLossyInput = {
  /**
   * Search query string.
   */
  query: string;
  /**
   * Field name containing the indexed text.
   */
  indexField: string;
  /**
   * Optional maximum number of results to return.
   */
  limit?: number;
  /**
   * Optional cursor string for pagination.
   */
  cursor?: string;
  /**
   * Optional backend override (defaults to configured backend).
   */
  backend?: IndexBackend;
  /**
   * Optional limits override for search execution.
   */
  limits?: ResolvedSearchLimits;
  /**
   * Optional trace instance for metrics collection.
   */
  trace?: SearchTrace;
};

/**
 * Input for exact search with verification/paging support.
 * */
export type SearchExactInput = {
  /**
   * Search query string.
   */
  query: string;
  /**
   * Field name containing the indexed text.
   */
  indexField: string;
  /**
   * Optional maximum number of results to return.
   */
  limit?: number;
  /**
   * Optional cursor string for pagination.
   */
  cursor?: string;
  /**
   * Optional backend override (defaults to configured backend).
   */
  backend?: IndexBackend;
  /**
   * Optional limits override for search execution.
   */
  limits?: ResolvedSearchLimits;
  /**
   * Optional trace instance for metrics collection.
   */
  trace?: SearchTrace;
};

/**
 * Search results with normalized tokens and an optional cursor.
 * */
export type SearchResult = {
  /**
   * Normalized query string.
   */
  normalized: string;
  /**
   * Tokens derived from the normalized query.
   */
  tokens: string[];
  /**
   * Matching document ids.
   */
  docIds: DocId[];
  /**
   * Cursor string for the next page, if more results exist.
   */
  nextCursor?: string;
};

let configuredBackend: IndexBackend | undefined;

/**
 * Set the default backend used by search and mutation calls.
 * @param backend Backend to use for subsequent operations.
 * @returns Nothing.
 * */
export function setIndexBackend(
  /**
   * Backend to use for subsequent indexing and search operations.
   */
  backend: IndexBackend,
): void {
  configuredBackend = backend;
}

function resolveBackend(backend: IndexBackend | undefined): IndexBackend {
  if (backend) {
    return backend;
  }

  if (!configuredBackend) {
    throw new Error('Index backend is not configured. Call setIndexBackend or pass backend.');
  }

  return configuredBackend;
}

function setBackendTrace(backend: IndexBackend, trace: SearchTrace | undefined): void {
  if (typeof (backend as TraceableIndexBackend).setActiveTrace === 'function') {
    (backend as TraceableIndexBackend).setActiveTrace(trace);
  }
}

async function hashString(value: string): Promise<string> {
  return createHash('sha256').update(value).digest('hex');
}

function intersectTwoSorted(left: DocId[], right: DocId[]): DocId[] {
  const results: DocId[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    const leftValue = left[leftIndex];
    const rightValue = right[rightIndex];

    if (leftValue === rightValue) {
      results.push(leftValue);
      leftIndex += 1;
      rightIndex += 1;
    } else if (compareDocId(leftValue, rightValue) < 0) {
      leftIndex += 1;
    } else {
      rightIndex += 1;
    }
  }

  return results;
}

function intersectSorted(lists: DocId[][]): DocId[] {
  if (lists.length === 0) {
    return [];
  }

  return lists.reduce((acc, current) => intersectTwoSorted(acc, current));
}

function supportsDocTokens(reader: IndexReader): reader is IndexReader & DocTokenReader {
  return (
    'hasDocToken' in reader && typeof (reader as DocTokenReader).hasDocToken === 'function'
  );
}

function supportsLossyPaging(reader: IndexReader): reader is IndexReader & LossyPagingReader & DocTokenReader {
  return (
    'queryLossyPostingsPage' in reader &&
    supportsDocTokens(reader)
  );
}

function supportsLossyPagingForExact(reader: IndexReader): reader is IndexReader & LossyPagingReader {
  return 'queryLossyPostingsPage' in reader;
}

function supportsBatchDocTokens(reader: IndexReader): reader is IndexReader & DocTokenBatchReader {
  return (
    'batchHasDocTokens' in reader &&
    typeof (reader as DocTokenBatchReader).batchHasDocTokens === 'function'
  );
}

function buildLossyPageOptions(
  limit: number | undefined,
  exclusiveStartDocId: DocId | undefined,
): LossyPostingsPageOptions {
  return {
    limit: limit ?? 50,
    exclusiveStartDocId,
  };
}

function buildExactPositions(tokens: string[]): Map<string, number[]> {
  const positions = new Map<string, number[]>();

  tokens.forEach((token, index) => {
    const list = positions.get(token) ?? [];
    list.push(index);
    positions.set(token, list);
  });

  return positions;
}

type DocTokenMembershipChecker = {
  hasDocTokens(docId: DocId, tokens: string[]): Promise<boolean>;
  filterDocsByTokens(docIds: DocId[], tokens: string[]): Promise<Set<DocId>>;
};

class SearchLimitTracker {
  private readonly maxTokens: number;
  private readonly maxPostingsPages: number;
  private readonly maxCandidatesVerified: number;
  private readonly softTimeBudgetMs: number;
  private readonly startTime = Date.now();

  constructor(limits: ResolvedSearchLimits = SEARCH_DEFAULTS, private readonly trace?: SearchTrace) {
    this.trace = trace;

    this.maxTokens = limits.maxTokens;
    this.maxPostingsPages = limits.maxPostingsPages;
    this.maxCandidatesVerified = limits.maxCandidatesVerified;
    this.softTimeBudgetMs = limits.softTimeBudgetMs;
  }

  private tokensConsumed = 0;
  private postingsPagesConsumed = 0;
  private candidatesVerified = 0;

  tryConsumePostingsPage(): boolean {
    this.postingsPagesConsumed += 1;
    if (this.trace) {
      this.trace.postingsPages += 1;
    }
    return this.postingsPagesConsumed <= this.maxPostingsPages;
  }

  tryConsumeCandidate(tokensProcessed: number): boolean {
    this.candidatesVerified += 1;
    this.tokensConsumed += tokensProcessed;
    if (this.trace) {
      this.trace.candidatesVerified += 1;
    }
    return (
      this.candidatesVerified <= this.maxCandidatesVerified &&
      this.tokensConsumed <= this.maxTokens
    );
  }

  shouldStop(): boolean {
    if (this.softTimeBudgetMs >= 0 && Date.now() - this.startTime >= this.softTimeBudgetMs) {
      return true;
    }

    return (
      this.tokensConsumed > this.maxTokens ||
      this.postingsPagesConsumed > this.maxPostingsPages ||
      this.candidatesVerified > this.maxCandidatesVerified
    );
  }
}

function createDocTokenKey({docId, indexField, token}: DocTokenKey): string {
  return `${indexField}#${docId}#${token}`;
}

function buildDocTokenMembershipChecker(
  reader: IndexReader,
  indexField: string,
  trace?: SearchTrace,
): DocTokenMembershipChecker {
  if (!supportsDocTokens(reader)) {
    return {
      hasDocTokens: async () => true,
      filterDocsByTokens: async (docIds) => new Set(docIds),
    };
  }

  const cache = new Map<string, boolean>();
  const batchReader = supportsBatchDocTokens(reader) ? reader : undefined;

  return {
    async hasDocTokens(docId: DocId, tokens: string[]): Promise<boolean> {
      const distinctTokens = Array.from(new Set(tokens));
      const keys = distinctTokens.map((token) => ({docId, indexField, token}));
      const missingKeys = keys.filter((key) => !cache.has(createDocTokenKey(key)));

      if (missingKeys.length && batchReader) {
        if (trace) {
          trace.batchGetCalls += 1;
          trace.batchGetKeys += missingKeys.length;
        }
        const results = await batchReader.batchHasDocTokens(missingKeys);
        missingKeys.forEach((key, index) => {
          cache.set(createDocTokenKey(key), results[index]);
        });
      } else if (missingKeys.length) {
        await Promise.all(
          missingKeys.map(async (key) => {
            const exists = await reader.hasDocToken(key.docId, key.indexField, key.token);
            cache.set(createDocTokenKey(key), exists);
          }),
        );
      }

      return keys.every((key) => cache.get(createDocTokenKey(key)) === true);
    },
    async filterDocsByTokens(docIds: DocId[], tokens: string[]): Promise<Set<DocId>> {
      const distinctTokens = Array.from(new Set(tokens));
      const keys = docIds.flatMap((docId) =>
        distinctTokens.map((token) => ({docId, indexField, token} satisfies DocTokenKey)),
      );
      const missingKeys = keys.filter((key) => !cache.has(createDocTokenKey(key)));

      if (missingKeys.length && batchReader) {
        if (trace) {
          trace.batchGetCalls += 1;
          trace.batchGetKeys += missingKeys.length;
        }
        const results = await batchReader.batchHasDocTokens(missingKeys);
        missingKeys.forEach((key, index) => {
          cache.set(createDocTokenKey(key), results[index]);
        });
      } else if (missingKeys.length) {
        await Promise.all(
          missingKeys.map(async (key) => {
            const exists = await reader.hasDocToken(key.docId, key.indexField, key.token);
            cache.set(createDocTokenKey(key), exists);
          }),
        );
      }

      const matchingDocs = new Set<DocId>();
      docIds.forEach((docId) => {
        const hasAllTokens = distinctTokens.every((token) =>
          cache.get(createDocTokenKey({docId, indexField, token})) === true,
        );
        if (hasAllTokens) {
          matchingDocs.add(docId);
        }
      });

      return matchingDocs;
    },
  };
}

type ExactPositionsLoader = {
  loadPositions(token: string, docId: DocId): Promise<number[] | undefined>;
  loadBatch(keys: DocTokenKey[]): Promise<void>;
};

function buildExactPositionsLoader(
  reader: IndexReader,
  indexField: string,
  trace?: SearchTrace,
): ExactPositionsLoader {
  const cache = new Map<string, number[] | undefined>();
  const batchLoader =
    typeof reader.batchLoadExactPositions === 'function'
      ? reader.batchLoadExactPositions.bind(reader)
      : undefined;

  return {
    async loadPositions(token: string, docId: DocId): Promise<number[] | undefined> {
      const key = createDocTokenKey({docId, indexField, token});
      if (!cache.has(key)) {
        cache.set(key, await reader.loadExactPositions(token, indexField, docId));
      }

      return cache.get(key);
    },
    async loadBatch(keys: DocTokenKey[]): Promise<void> {
      const missingKeys = keys.filter((key) => !cache.has(createDocTokenKey(key)));

      if (!missingKeys.length) {
        return;
      }

      const uniqueMissingKeys: DocTokenKey[] = [];
      const seen = new Set<string>();

      missingKeys.forEach((key) => {
        const cacheKey = createDocTokenKey(key);
        if (!seen.has(cacheKey)) {
          seen.add(cacheKey);
          uniqueMissingKeys.push(key);
        }
      });

      if (batchLoader) {
        if (trace) {
          trace.batchGetCalls += 1;
          trace.batchGetKeys += uniqueMissingKeys.length;
        }
        const results = await batchLoader(uniqueMissingKeys);
        uniqueMissingKeys.forEach((key, index) => {
          cache.set(createDocTokenKey(key), results[index]);
        });
        return;
      }

      await Promise.all(
        uniqueMissingKeys.map(async (key) => {
          cache.set(
            createDocTokenKey(key),
            await reader.loadExactPositions(key.token, key.indexField, key.docId),
          );
        }),
      );
    },
  };
}

type TokenStatsCache = Map<string, TokenStats | undefined>;

async function loadTokenStats(
  reader: IndexReader,
  cache: TokenStatsCache,
  token: string,
  indexField: string,
): Promise<TokenStats | undefined> {
  const cacheKey = `${indexField}#${token}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const stats = await reader.loadTokenStats(token, indexField);
  cache.set(cacheKey, stats);
  return stats;
}

async function selectPrimaryToken(
  reader: IndexReader,
  tokens: string[],
  cache: TokenStatsCache,
  indexField: string,
  existingPlan?: PlannerMetadata,
  trace?: SearchTrace,
): Promise<PlannerMetadata> {
  const sorting = existingPlan?.sorting ?? 'docIdAsc';

  if (existingPlan && tokens.includes(existingPlan.primaryToken)) {
    return {...existingPlan, sorting};
  }

  let primaryToken = tokens[0];
  let statsVersion = existingPlan?.statsVersion;
  let smallestDf = Number.POSITIVE_INFINITY;

  for (const token of tokens) {
    const stats = await loadTokenStats(reader, cache, token, indexField);
    const df = stats?.df;
    if (df !== undefined && df < smallestDf) {
      smallestDf = df;
      primaryToken = token;
      statsVersion = stats?.version;
    }
  }

  if (trace) {
    trace.primaryTokenHash = await hashString(primaryToken);
  }

  return {primaryToken, statsVersion, sorting};
}

function resolveIndexText(document: DocumentRecord, indexField: string): string {
  const value = document[indexField];
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

/**
 * Index a document using exact and lossy backends.
 * @param document Document record to index.
 * @param primaryField Field name used as the document id.
 * @param indexField Field name containing the text to index.
 * @param backend Optional backend override (defaults to configured backend).
 * @returns Promise resolved once indexing is complete.
 * */
export async function indexDocument({
                                      document,
                                      primaryField,
                                      indexField,
                                      backend,
                                    }: IndexDocumentInput): Promise<void> {
  const writer = resolveBackend(backend);
  const docId = normalizeDocId(document[primaryField], primaryField);
  const text = resolveIndexText(document, indexField);

  if (!text) {
    return;
  }

  const {tokens: exactTokens} = tokenize(text);
  const {tokens: lossyTokens} = tokenizeLossyTrigrams(text);

  const uniqueLossyTokens = Array.from(new Set(lossyTokens));
  const positions = buildExactPositions(exactTokens);

  await Promise.all(
    uniqueLossyTokens.map((token) => writer.addLossyPosting(token, indexField, docId)),
  );
  await Promise.all(
    Array.from(positions.entries()).map(([token, tokenPositions]) =>
      writer.addExactPositions(token, indexField, docId, tokenPositions),
    ),
  );
}

/**
 * Remove a document from exact and lossy backends.
 * @param document Document record to remove.
 * @param primaryField Field name used as the document id.
 * @param indexField Field name containing the text to remove from the index.
 * @param backend Optional backend override (defaults to configured backend).
 * @returns Promise resolved once removal is complete.
 * */
export async function removeDocument({
                                       document,
                                       primaryField,
                                       indexField,
                                       backend,
                                     }: RemoveDocumentInput): Promise<void> {
  const writer = resolveBackend(backend);
  const docId = normalizeDocId(document[primaryField], primaryField);
  const text = resolveIndexText(document, indexField);

  if (!text) {
    return;
  }

  const {tokens: exactTokens} = tokenize(text);
  const {tokens: lossyTokens} = tokenizeLossyTrigrams(text);

  const uniqueLossyTokens = Array.from(new Set(lossyTokens));
  const uniqueExactTokens = Array.from(new Set(exactTokens));

  await Promise.all(
    uniqueLossyTokens.map((token) => writer.removeLossyPosting(token, indexField, docId)),
  );
  await Promise.all(
    uniqueExactTokens.map((token) => writer.removeExactPositions(token, indexField, docId)),
  );
}

/**
 * Perform a lossy search and return matching document ids.
 * @param query Search query string.
 * @param indexField Field name containing the indexed text.
 * @param limit Optional maximum number of results to return.
 * @param cursor Optional cursor string for pagination.
 * @param backend Optional backend override (defaults to configured backend).
 * @param limits Optional limits override for search execution.
 * @param trace Optional trace instance for metrics collection.
 * @returns Search results with doc ids and optional next cursor.
 * */
export async function searchLossy({
                                    query,
                                    indexField,
                                    limit,
                                    cursor,
                                    backend,
                                    limits,
                                    trace,
                                  }: SearchLossyInput): Promise<SearchResult> {
  const reader = resolveBackend(backend);
  setBackendTrace(reader, trace);

  try {
    const {normalized, tokens} = tokenizeLossyTrigrams(query);
    const wordTokens = normalized.length ? normalized.split(/\s+/) : [];
    const cursorState = decodeLossyCursor(cursor);
    const statsCache: TokenStatsCache = new Map();
    const distinctTokens = Array.from(new Set(tokens));
    const prefixTokens = distinctTokens.filter((token) => token.endsWith('*'));
    const trigramTokens = distinctTokens.filter((token) => !token.endsWith('*'));
    const tokenCost = Math.max(1, wordTokens.length);
    const secondaryTokenCost = Math.max(0, tokenCost - 1);
    if (trace) {
      trace.tokenCount = wordTokens.length;
      trace.queryHash = await hashString(normalized);
    }
    const docTokenChecker = buildDocTokenMembershipChecker(reader, indexField, trace);
    const limitTracker = new SearchLimitTracker(limits, trace);

    if (distinctTokens.length === 0) {
      return {normalized, tokens, docIds: []};
    }

    const usePaging = supportsLossyPaging(reader) && prefixTokens.length === 0;

    if (!usePaging) {
      const postings = await Promise.all(
        trigramTokens.map((token) => reader.loadLossyPostings(token, indexField)),
      );
      const trigramCandidates = trigramTokens.length ? intersectSorted(postings) : [];
      const prefixPostings = await Promise.all(
        prefixTokens.map((token) => reader.loadLossyPostings(token, indexField)),
      );
      const prefixCandidates = prefixTokens.length ? intersectSorted(prefixPostings) : [];
      const mergedCandidateSet = new Set<DocId>();
      for (const docId of trigramCandidates) {
        mergedCandidateSet.add(docId);
      }
      for (const docId of prefixCandidates) {
        mergedCandidateSet.add(docId);
      }

      const mergedCandidates = Array.from(mergedCandidateSet).sort(compareDocId);
      const lastDocId = cursorState?.lastDocId;
      const filtered =
        lastDocId !== undefined
          ? mergedCandidates.filter((docId) => compareDocId(docId, lastDocId) > 0)
          : mergedCandidates;
      const docIds: DocId[] = [];
      let hasMore = false;
      let lastProcessed: DocId | undefined;

      for (const candidate of filtered) {
        lastProcessed = candidate;

        if (limitTracker.shouldStop() || !limitTracker.tryConsumeCandidate(tokenCost)) {
          hasMore = true;
          break;
        }

        docIds.push(candidate);
        if (limit !== undefined && docIds.length >= limit) {
          hasMore = docIds.length < filtered.length;
          break;
        }
      }

      const cursorDocId = lastProcessed ?? cursorState?.lastDocId;
      const nextCursor =
        hasMore && cursorDocId !== undefined ? encodeLossyCursor({lastDocId: cursorDocId}) : undefined;

      return {normalized, tokens, docIds, nextCursor};
    }

    const planner = await selectPrimaryToken(
      reader,
      distinctTokens,
      statsCache,
      indexField,
      cursorState?.plan,
      trace,
    );
    const primaryToken = planner.primaryToken;
    const secondaryTokens = distinctTokens.filter((token) => token !== primaryToken);
    const max = limit ?? Number.POSITIVE_INFINITY;
    const docIds: DocId[] = [];
    let exclusiveStartDocId = cursorState?.lastDocId;
    let lastProcessedDocId: DocId | undefined;
    let hasMore = false;

    while (docIds.length < max) {
      if (limitTracker.shouldStop() || !limitTracker.tryConsumePostingsPage()) {
        hasMore = true;
        break;
      }

      const page = await reader.queryLossyPostingsPage(
        primaryToken,
        indexField,
        buildLossyPageOptions(limit, exclusiveStartDocId),
      );

      if (!page.docIds.length) {
        hasMore = page.lastEvaluatedDocId !== undefined;
        break;
      }

      for (const docId of page.docIds) {
        lastProcessedDocId = docId;
        if (
          cursorState?.lastDocId !== undefined &&
          compareDocId(docId, cursorState.lastDocId) <= 0
        ) {
          continue;
        }

        if (
          limitTracker.shouldStop() ||
          !limitTracker.tryConsumeCandidate(secondaryTokenCost) ||
          (secondaryTokens.length && !(await docTokenChecker.hasDocTokens(docId, secondaryTokens)))
        ) {
          hasMore = true;
          continue;
        }

        docIds.push(docId);
        if (docIds.length >= max) {
          hasMore = true;
          break;
        }
      }

      if (docIds.length >= max) {
        break;
      }

      if (page.lastEvaluatedDocId === undefined) {
        break;
      }

      exclusiveStartDocId = page.lastEvaluatedDocId;
    }

    const nextCursor =
      hasMore && (lastProcessedDocId !== undefined || exclusiveStartDocId !== undefined)
        ? encodeLossyCursor({
          lastDocId: lastProcessedDocId ?? exclusiveStartDocId,
          plan: planner,
        })
        : undefined;

    return {normalized, tokens, docIds, nextCursor};
  } finally {
    setBackendTrace(reader, undefined);
  }
}

async function hasExactPhrase(
  reader: IndexReader,
  docId: DocId,
  indexField: string,
  phraseTokens: string[],
  docTokenChecker: DocTokenMembershipChecker,
  positionsLoader: ExactPositionsLoader,
): Promise<boolean> {
  if (phraseTokens.length === 0) {
    return false;
  }

  const hasTokens = await docTokenChecker.hasDocTokens(docId, phraseTokens);
  if (!hasTokens) {
    return false;
  }

  const positionsByToken = await Promise.all(
    phraseTokens.map(async (token) => positionsLoader.loadPositions(token, docId)),
  );

  if (positionsByToken.some((positions) => !positions || positions.length === 0)) {
    return false;
  }

  const [firstPositions, ...restPositions] = positionsByToken as number[][];

  if (restPositions.length === 0) {
    return true;
  }

  const restSets = restPositions.map((positions) => new Set(positions));

  return firstPositions.some((start) =>
    restSets.every((positions, offset) => positions.has(start + offset + 1)),
  );
}

/**
 * Perform an exact search, optionally using a lossy pre-pass for candidates.
 * @param query Search query string.
 * @param indexField Field name containing the indexed text.
 * @param limit Optional maximum number of results to return.
 * @param cursor Optional cursor string for pagination.
 * @param backend Optional backend override (defaults to configured backend).
 * @param limits Optional limits override for search execution.
 * @param trace Optional trace instance for metrics collection.
 * @returns Search results with doc ids and optional next cursor.
 * */
export async function searchExact({
                                    query,
                                    indexField,
                                    limit,
                                    cursor,
                                    backend,
                                    limits,
                                    trace,
                                  }: SearchExactInput): Promise<SearchResult> {
  const reader = resolveBackend(backend);
  setBackendTrace(reader, trace);

  try {
    const {normalized, tokens: exactTokens} = tokenize(query);
    const {tokens: lossyTokens} = tokenizeLossyTrigrams(query);
    const cursorState = decodeExactCursor(cursor);
    const lastDocId = cursorState?.verification?.lastDocId;
    const statsCache: TokenStatsCache = new Map();

    const distinctExactTokens = Array.from(new Set(exactTokens));
    const distinctLossyTokens = Array.from(new Set(lossyTokens));

    if (distinctExactTokens.length === 0) {
      return {normalized, tokens: exactTokens, docIds: []};
    }

    if (trace) {
      trace.tokenCount = distinctLossyTokens.length;
      trace.queryHash = await hashString(normalized);
    }
    const docTokenChecker = buildDocTokenMembershipChecker(reader, indexField, trace);
    const positionsLoader = buildExactPositionsLoader(reader, indexField, trace);
    const limitTracker = new SearchLimitTracker(limits, trace);
    const preloadPositions = async (docIds: DocId[]): Promise<void> => {
      if (!docIds.length) {
        return;
      }

      const keys = docIds.flatMap((docId) =>
        distinctExactTokens.map((token) => ({docId, indexField, token} satisfies DocTokenKey)),
      );

      await positionsLoader.loadBatch(keys);
    };

    if (distinctLossyTokens.length === 0) {
      return {normalized, tokens: exactTokens, docIds: []};
    }

    if (!supportsLossyPagingForExact(reader)) {
      const postings = await Promise.all(
        distinctLossyTokens.map((token) => reader.loadLossyPostings(token, indexField)),
      );
      const candidates = intersectSorted(postings);
      const filteredCandidates =
        lastDocId !== undefined
          ? candidates.filter((docId) => compareDocId(docId, lastDocId) > 0)
          : candidates;
      const candidatesWithTokens = await docTokenChecker.filterDocsByTokens(
        filteredCandidates,
        exactTokens,
      );
      const max = limit ?? filteredCandidates.length;
      const docIds: DocId[] = [];
      let lastProcessed: DocId | undefined;
      let hasMore = false;

      for (const docId of filteredCandidates) {
        if (limitTracker.shouldStop() || !limitTracker.tryConsumeCandidate(exactTokens.length)) {
          hasMore = true;
          break;
        }

        lastProcessed = docId;
        if (!candidatesWithTokens.has(docId)) {
          continue;
        }

        if (
          await hasExactPhrase(reader, docId, indexField, exactTokens, docTokenChecker, positionsLoader)
        ) {
          docIds.push(docId);
          if (docIds.length >= max) {
            hasMore = docIds.length < filteredCandidates.length;
            break;
          }
        }
      }

      const lastCandidate = filteredCandidates[filteredCandidates.length - 1];
      if (!hasMore && lastProcessed !== undefined && lastCandidate !== undefined) {
        hasMore = compareDocId(lastProcessed, lastCandidate) < 0;
      }

      const cursorDocId = lastProcessed ?? lastDocId;
      const nextCursor = hasMore && cursorDocId !== undefined
        ? encodeExactCursor({verification: {lastDocId: cursorDocId}})
        : undefined;

      return {normalized, tokens: exactTokens, docIds, nextCursor};
    }

    const planner = await selectPrimaryToken(
      reader,
      distinctLossyTokens,
      statsCache,
      indexField,
      cursorState?.plan,
      trace,
    );
    const primaryToken = planner.primaryToken;
    const max = limit ?? Number.POSITIVE_INFINITY;
    const docIds: DocId[] = [];
    let pageStartDocId = cursorState?.lossy?.lastDocId;
    let lastProcessedDocId = lastDocId;
    let pendingCandidates = cursorState?.verification?.pendingCandidates ?? [];
    let pendingOffset = cursorState?.verification?.pendingOffset ?? 0;
    let limitsHit = false;

    const verifyCandidate = async (docId: DocId): Promise<boolean> => {
      lastProcessedDocId = docId;
      return hasExactPhrase(reader, docId, indexField, exactTokens, docTokenChecker, positionsLoader);
    };

    const nextCursorWithState = (
      verification?: ExactCursorState['verification'],
      lossyLastDocId?: DocId,
    ) =>
      encodeExactCursor({
        plan: planner,
        lossy: lossyLastDocId === undefined ? undefined : {lastDocId: lossyLastDocId},
        verification,
      });

    if (pendingOffset < 0) {
      pendingOffset = 0;
    }

    pendingOffset = Math.min(pendingOffset, pendingCandidates.length);

    await preloadPositions(pendingCandidates.slice(pendingOffset));

    while (pendingOffset < pendingCandidates.length && docIds.length < max) {
      if (limitTracker.shouldStop() || !limitTracker.tryConsumeCandidate(exactTokens.length)) {
        limitsHit = true;
        break;
      }

      const docId = pendingCandidates[pendingOffset];
      if (await verifyCandidate(docId)) {
        docIds.push(docId);
      }

      pendingOffset += 1;
    }

    if (docIds.length >= max || limitsHit) {
      return {
        normalized,
        tokens: exactTokens,
        docIds,
        nextCursor: nextCursorWithState(
          {
            lastDocId: lastProcessedDocId,
            pendingCandidates,
            pendingOffset,
          },
          pageStartDocId,
        ),
      };
    }

    pendingCandidates = [];
    pendingOffset = 0;

    while (docIds.length < max) {
      if (limitTracker.shouldStop() || !limitTracker.tryConsumePostingsPage()) {
        limitsHit = true;
        break;
      }

      const page = await reader.queryLossyPostingsPage(
        primaryToken,
        indexField,
        buildLossyPageOptions(limit, pageStartDocId),
      );

      if (!page.docIds.length) {
        break;
      }

      const pageCandidates = page.docIds.filter(
        (docId) =>
          lastProcessedDocId === undefined || compareDocId(docId, lastProcessedDocId) > 0,
      );
      const pageCandidatesWithTokens = await docTokenChecker.filterDocsByTokens(
        pageCandidates,
        exactTokens,
      );
      const candidatesToVerify = pageCandidates.filter((docId) =>
        pageCandidatesWithTokens.has(docId),
      );

      await preloadPositions(candidatesToVerify);

      while (pendingOffset < candidatesToVerify.length && docIds.length < max) {
        if (limitTracker.shouldStop() || !limitTracker.tryConsumeCandidate(exactTokens.length)) {
          limitsHit = true;
          break;
        }

        const docId = candidatesToVerify[pendingOffset];

        if (await verifyCandidate(docId)) {
          docIds.push(docId);
        }

        pendingOffset += 1;
      }

      if (docIds.length >= max || limitsHit) {
        return {
          normalized,
          tokens: exactTokens,
          docIds,
          nextCursor: nextCursorWithState(
            {
              lastDocId: lastProcessedDocId,
              pendingCandidates: candidatesToVerify,
              pendingOffset,
            },
            page.lastEvaluatedDocId ?? pageStartDocId,
          ),
        };
      }

      pendingOffset = 0;

      if (page.lastEvaluatedDocId === undefined) {
        break;
      }

      pageStartDocId = page.lastEvaluatedDocId;
    }

    if (limitsHit) {
      const verificationState =
        lastProcessedDocId === undefined && pendingCandidates.length === 0 && pendingOffset === 0
          ? undefined
          : {lastDocId: lastProcessedDocId, pendingCandidates, pendingOffset};

      return {
        normalized,
        tokens: exactTokens,
        docIds,
        nextCursor: nextCursorWithState(verificationState, pageStartDocId),
      };
    }

    return {normalized, tokens: exactTokens, docIds};
  } finally {
    setBackendTrace(reader, undefined);
  }
}
