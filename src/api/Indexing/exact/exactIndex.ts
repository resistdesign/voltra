/**
 * @packageDocumentation
 *
 * In-memory exact index that stores token positions per document. Useful for
 * tests and local workflows where you want phrase verification without DynamoDB.
 */
import type { DocId } from "../types";
import { compareDocId } from "../docId";

/**
 * Paging options for exact phrase verification.
 */
export type ExactQueryOptions = {
  /**
   * Maximum number of verified results to return.
   */
  limit?: number;
  /**
   * Resume cursor using the last processed doc id.
   */
  lastDocId?: DocId;
};

/**
 * Results for exact phrase verification.
 */
export type ExactQueryResult = {
  /**
   * Verified document ids matching the phrase.
   */
  docIds: DocId[];
  /**
   * Cursor to resume verification for remaining candidates.
   */
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

/**
 * In-memory exact index for token positions and phrase checks.
 */
export class ExactIndex {
  private postings: TokenPostings = new Map();

  private buildTokenKey(indexField: string, token: string): string {
    return `${indexField}\u0000${token}`;
  }

  /**
   * Add exact token positions for a document.
   * @param token Token value to store positions for.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @param positions Token positions within the document.
   * @returns Nothing.
   */
  addPositions(token: string, indexField: string, docId: DocId, positions: number[]): void {
    const key = this.buildTokenKey(indexField, token);
    const tokenPostings = this.postings.get(key) ?? new Map();
    tokenPostings.set(docId, [...positions]);
    this.postings.set(key, tokenPostings);
  }

  /**
   * Remove exact token positions for a document.
   * @param token Token value to remove positions for.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Nothing.
   */
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

  /**
   * Add a document by enumerating positions for each token.
   * @param docId Document id to add.
   * @param indexField Field name the tokens are indexed under.
   * @param tokens Token list for the document.
   * @returns Nothing.
   */
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

  /**
   * Load exact positions for a token in a document.
   * @param token Token value to retrieve positions for.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Positions array or undefined if not found.
   */
  getPositions(token: string, indexField: string, docId: DocId): number[] | undefined {
    const key = this.buildTokenKey(indexField, token);
    return this.postings.get(key)?.get(docId);
  }

  /**
   * Check if a document contains an exact phrase.
   * @param docId Document id to verify.
   * @param indexField Field name the tokens are indexed under.
   * @param phraseTokens Token sequence representing the phrase.
   * @returns True when the phrase exists in the document.
   */
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

  /**
   * Verify candidate documents against a phrase, with optional paging.
   * @param phraseTokens Token sequence representing the phrase.
   * @param indexField Field name the tokens are indexed under.
   * @param candidates Candidate document ids to verify.
   * @param options Paging options for verification.
   * @returns Verified results and optional next cursor.
   */
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
