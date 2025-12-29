/**
 * @packageDocumentation
 *
 * In-memory exact index that stores token positions per document. Useful for
 * tests and local workflows where you want phrase verification without DynamoDB.
 */
import type { DocId } from "../types";
import { compareDocId } from "../docId";

export type ExactQueryOptions = {
  limit?: number;
  lastDocId?: DocId;
};

export type ExactQueryResult = {
  docIds: DocId[];
  nextCursor?: DocId;
};

type PositionMap = Map<DocId, number[]>;

type TokenPostings = Map<string, PositionMap>;

function findStartIndex(values: DocId[], lastDocId?: DocId): number {
  if (lastDocId === undefined) {
    return 0;
  }

  let low = 0;
  let high = values.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (compareDocId(values[mid], lastDocId) <= 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

export class ExactIndex {
  private postings: TokenPostings = new Map();

  private buildTokenKey(indexField: string, token: string): string {
    return `${indexField}\u0000${token}`;
  }

  addPositions(token: string, indexField: string, docId: DocId, positions: number[]): void {
    const key = this.buildTokenKey(indexField, token);
    const tokenPostings = this.postings.get(key) ?? new Map();
    tokenPostings.set(docId, [...positions]);
    this.postings.set(key, tokenPostings);
  }

  removePositions(token: string, indexField: string, docId: DocId): void {
    const key = this.buildTokenKey(indexField, token);
    const tokenPostings = this.postings.get(key);
    if (!tokenPostings) {
      return;
    }

    tokenPostings.delete(docId);
    if (tokenPostings.size === 0) {
      this.postings.delete(key);
    }
  }

  addDocument(docId: DocId, indexField: string, tokens: string[]): void {
    tokens.forEach((token, position) => {
      const key = this.buildTokenKey(indexField, token);
      const tokenPostings = this.postings.get(key) ?? new Map();
      const positions = tokenPostings.get(docId) ?? [];
      positions.push(position);
      tokenPostings.set(docId, positions);
      this.postings.set(key, tokenPostings);
    });
  }

  getPositions(token: string, indexField: string, docId: DocId): number[] | undefined {
    const key = this.buildTokenKey(indexField, token);
    return this.postings.get(key)?.get(docId);
  }

  hasPhrase(docId: DocId, indexField: string, phraseTokens: string[]): boolean {
    if (phraseTokens.length === 0) {
      return false;
    }

    const [firstToken, ...restTokens] = phraseTokens;
    const firstPositions = this.getPositions(firstToken, indexField, docId);

    if (!firstPositions || firstPositions.length === 0) {
      return false;
    }

    if (restTokens.length === 0) {
      return true;
    }

    const restPositionSets = restTokens.map((token) => {
      const positions = this.getPositions(token, indexField, docId);
      return new Set(positions ?? []);
    });

    return firstPositions.some((start) =>
      restPositionSets.every((positions, offset) => positions.has(start + offset + 1)),
    );
  }

  verifyCandidates(
    phraseTokens: string[],
    indexField: string,
    candidates: DocId[],
    options: ExactQueryOptions = {},
  ): ExactQueryResult {
    const startIndex = findStartIndex(candidates, options.lastDocId);
    const limit = options.limit ?? candidates.length;
    const verified: DocId[] = [];

    let lastProcessed: DocId | undefined;

    for (let index = startIndex; index < candidates.length; index += 1) {
      const docId = candidates[index];
      lastProcessed = docId;

      if (this.hasPhrase(docId, indexField, phraseTokens)) {
        verified.push(docId);
        if (verified.length >= limit) {
          break;
        }
      }
    }

    if (
      lastProcessed !== undefined &&
      candidates[candidates.length - 1] !== undefined &&
      compareDocId(lastProcessed, candidates[candidates.length - 1]) < 0
    ) {
      return { docIds: verified, nextCursor: lastProcessed };
    }

    return { docIds: verified };
  }
}
