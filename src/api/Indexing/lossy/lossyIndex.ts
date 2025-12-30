/**
 * @packageDocumentation
 *
 * In-memory lossy index for recall-heavy search. It stores token postings and
 * supports paging with cursor-style doc IDs.
 */
import type { DocId } from "../types";
import { compareDocId } from "../docId";

/**
 * Paging options for lossy postings queries.
 */
export type LossyQueryOptions = {
  /**
   * Maximum number of postings to return.
   */
  limit?: number;
  /**
   * Resume cursor using the last processed doc id.
   */
  lastDocId?: DocId;
};

/**
 * Results for lossy postings queries.
 */
export type LossyQueryResult = {
  /**
   * Document ids for the token postings.
   */
  docIds: DocId[];
  /**
   * Cursor to resume paging through postings.
   */
  nextCursor?: DocId;
};

function insertSortedUnique(values: DocId[], docId: DocId): void {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (compareDocId(values[mid], docId) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  if (values[low] !== docId) {
    values.splice(low, 0, docId);
  }
}

function removeSorted(values: DocId[], docId: DocId): boolean {
  let low = 0;
  let high = values.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = values[mid];

    if (value === docId) {
      values.splice(mid, 1);
      return true;
    }

    if (compareDocId(value, docId) < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return false;
}

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
 * In-memory lossy index for token postings.
 */
export class LossyIndex {
  private postings = new Map<string, DocId[]>();

  private buildTokenKey(indexField: string, token: string): string {
    return `${indexField}\u0000${token}`;
  }

  /**
   * Add a posting for a token.
   * @param token Token value to add.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Nothing.
   */
  addPosting(token: string, indexField: string, docId: DocId): void {
    const key = this.buildTokenKey(indexField, token);
    const list = this.postings.get(key) ?? [];
    insertSortedUnique(list, docId);
    this.postings.set(key, list);
  }

  /**
   * Remove a posting for a token.
   * @param token Token value to remove.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Nothing.
   */
  removePosting(token: string, indexField: string, docId: DocId): void {
    const key = this.buildTokenKey(indexField, token);
    const list = this.postings.get(key);
    if (!list) {
      return;
    }

    if (removeSorted(list, docId) && list.length === 0) {
      this.postings.delete(key);
    }
  }

  /**
   * Add a document by inserting postings for each unique token.
   * @param docId Document id to add.
   * @param indexField Field name the tokens are indexed under.
   * @param tokens Token list for the document.
   * @returns Nothing.
   */
  addDocument(docId: DocId, indexField: string, tokens: string[]): void {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      this.addPosting(token, indexField, docId);
    }
  }

  /**
   * Get postings for a token with optional paging.
   * @param token Token value to fetch postings for.
   * @param indexField Field name the token was indexed under.
   * @param options Paging options for the query.
   * @returns Postings result with optional next cursor.
   */
  getPostings(
    token: string,
    indexField: string,
    options: LossyQueryOptions = {},
  ): LossyQueryResult {
    const key = this.buildTokenKey(indexField, token);
    const list = this.postings.get(key) ?? [];
    const startIndex = findStartIndex(list, options.lastDocId);
    const limit = options.limit ?? list.length;
    const docIds = list.slice(startIndex, startIndex + limit);

    if (startIndex + limit < list.length && docIds.length > 0) {
      return { docIds, nextCursor: docIds[docIds.length - 1] };
    }

    return { docIds };
  }
}
