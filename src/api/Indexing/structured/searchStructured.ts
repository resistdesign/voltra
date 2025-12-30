import { decodeStructuredCursor, encodeStructuredCursor } from "./cursor";
import type { DocId } from "../types";
import { compareDocId } from "../docId";
import type {
  CandidatePage,
  StructuredQueryOptions,
  StructuredRangeWhere,
  StructuredTermWhere,
  Where,
  WhereValue,
} from "./types";

type StructuredTermIndex = {
  query(
    field: string,
    mode: StructuredTermWhere['mode'],
    value: WhereValue,
    options?: StructuredQueryOptions,
  ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }>;
};

type StructuredRangeIndex = {
  between(
    field: string,
    lower: WhereValue,
    upper: WhereValue,
    options?: StructuredQueryOptions,
  ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }>;
  gte(
    field: string,
    lower: WhereValue,
    options?: StructuredQueryOptions,
  ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }>;
  lte(
    field: string,
    upper: WhereValue,
    options?: StructuredQueryOptions,
  ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }>;
};

export type StructuredSearchDependencies = {
  /**
   * Term query dependency for equality/contains lookups.
   */
  terms: StructuredTermIndex;
  /**
   * Range query dependency for between/gte/lte lookups.
   */
  ranges: StructuredRangeIndex;
};

type CandidateSource = {
  size: number;
  candidateIds: DocId[];
};

type CursorState = {
  lastDocId?: DocId;
  termToken?: string;
  rangeToken?: string;
};

function intersectSorted(left: DocId[], right: DocId[]): DocId[] {
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

function mergeOrSorted(lists: DocId[][]): DocId[] {
  const unique = new Set<DocId>();
  lists.forEach((list) => list.forEach((docId) => unique.add(docId)));
  return Array.from(unique).sort(compareDocId);
}

function applyCursor(candidates: DocId[], lastDocId?: DocId): DocId[] {
  if (lastDocId === undefined) {
    return candidates;
  }

  let low = 0;
  let high = candidates.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (compareDocId(candidates[mid], lastDocId) <= 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return candidates.slice(low);
}

async function evaluateTerm(
  dependencies: StructuredSearchDependencies,
  where: StructuredTermWhere,
  options: StructuredQueryOptions,
  cursorState: CursorState | undefined,
): Promise<CandidateSource & { nextCursor?: string }> {
  const response = await dependencies.terms.query(where.field, where.mode, where.value, {
    limit: options.limit,
    cursor: cursorState?.termToken,
  });

  const candidateIds = response.candidateIds.slice().sort(compareDocId);
  const nextCursor =
    response.lastEvaluatedKey || candidateIds.length > 0
      ? encodeStructuredCursor({
          lastDocId: candidateIds[candidateIds.length - 1],
          backendToken: response.lastEvaluatedKey,
        })
      : undefined;

  return { size: candidateIds.length, candidateIds, nextCursor };
}

async function evaluateRange(
  dependencies: StructuredSearchDependencies,
  where: StructuredRangeWhere,
  options: StructuredQueryOptions,
  cursorState: CursorState | undefined,
): Promise<CandidateSource & { nextCursor?: string }> {
  const rangeOptions = { limit: options.limit, cursor: cursorState?.rangeToken };
  let response: { candidateIds: DocId[]; lastEvaluatedKey?: string };

  if (where.type === 'between') {
    response = await dependencies.ranges.between(where.field, where.lower, where.upper, rangeOptions);
  } else if (where.type === 'gte') {
    response = await dependencies.ranges.gte(where.field, where.value, rangeOptions);
  } else {
    response = await dependencies.ranges.lte(where.field, where.value, rangeOptions);
  }

  const candidateIds = response.candidateIds.slice().sort(compareDocId);
  const nextCursor =
    response.lastEvaluatedKey || candidateIds.length > 0
      ? encodeStructuredCursor({
          lastDocId: candidateIds[candidateIds.length - 1],
          backendToken: response.lastEvaluatedKey,
        })
      : undefined;

  return { size: candidateIds.length, candidateIds, nextCursor };
}

async function evaluateLeaf(
  dependencies: StructuredSearchDependencies,
  where: StructuredTermWhere | StructuredRangeWhere,
  options: StructuredQueryOptions,
  cursorState: CursorState | undefined,
): Promise<CandidateSource & { nextCursor?: string }> {
  if (where.type === 'term') {
    return evaluateTerm(dependencies, where, options, cursorState);
  }

  return evaluateRange(dependencies, where, options, cursorState);
}

async function evaluateWhere(
  dependencies: StructuredSearchDependencies,
  where: Where,
  options: StructuredQueryOptions,
  cursorState: CursorState | undefined,
): Promise<CandidateSource & { nextCursor?: string }> {
  if ('and' in where) {
    if (where.and.length === 0) {
      return { size: 0, candidateIds: [] };
    }

    const childResults = await Promise.all(
      where.and.map((child) => evaluateWhere(dependencies, child, {}, undefined)),
    );
    const ordered = childResults.slice().sort((a, b) => a.size - b.size);
    let candidates = ordered[0]?.candidateIds ?? [];

    for (let index = 1; index < ordered.length; index += 1) {
      candidates = intersectSorted(candidates, ordered[index].candidateIds);
      if (candidates.length === 0) {
        break;
      }
    }

    const filtered = applyCursor(candidates, cursorState?.lastDocId);
    const limit = options.limit ?? filtered.length;
    const candidateIds = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;
    const nextCursor = hasMore
      ? encodeStructuredCursor({ lastDocId: candidateIds[candidateIds.length - 1] })
      : undefined;

    return { size: candidates.length, candidateIds, nextCursor };
  }

  if ('or' in where) {
    if (where.or.length === 0) {
      return { size: 0, candidateIds: [] };
    }

    const childResults = await Promise.all(
      where.or.map((child) => evaluateWhere(dependencies, child, {}, undefined)),
    );
    const candidates = mergeOrSorted(childResults.map((result) => result.candidateIds));
    const filtered = applyCursor(candidates, cursorState?.lastDocId);
    const limit = options.limit ?? filtered.length;
    const candidateIds = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;
    const nextCursor = hasMore
      ? encodeStructuredCursor({ lastDocId: candidateIds[candidateIds.length - 1] })
      : undefined;

    return { size: candidates.length, candidateIds, nextCursor };
  }

  return evaluateLeaf(dependencies, where, options, cursorState);
}

function parseCursor(cursor?: string): CursorState | undefined {
  if (!cursor) {
    return undefined;
  }

  const decoded = decodeStructuredCursor(cursor);

  if (!decoded) {
    return undefined;
  }

  return {
    lastDocId: decoded.lastDocId,
    termToken: decoded.backendToken,
    rangeToken: decoded.backendToken,
  };
}

/**
 * Execute a structured query using the provided term/range dependencies.
 * @param dependencies Query dependencies for term and range lookups.
 * @param where Structured query expression to evaluate.
 * @param options Optional paging options.
 * @returns Candidate page with optional cursor.
 */
export async function searchStructured(
  dependencies: StructuredSearchDependencies,
  where: Where,
  options: StructuredQueryOptions = {},
): Promise<CandidatePage> {
  const cursorState = parseCursor(options.cursor);
  const result = await evaluateWhere(dependencies, where, options, cursorState);

  if (result.candidateIds.length === 0) {
    return { candidateIds: [] };
  }

  return { candidateIds: result.candidateIds, cursor: result.nextCursor };
}
