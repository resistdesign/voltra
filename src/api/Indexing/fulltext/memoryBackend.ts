/**
 * @packageDocumentation
 *
 * In-memory fulltext backend that combines lossy and exact indexes plus
 * doc-token membership checks. Useful for tests and local development.
 */
import { ExactIndex } from "../exact/exactIndex";
import { LossyIndex } from "../lossy/lossyIndex";
import type {
  DocId,
  DocTokenBatchReader,
  DocTokenKey,
  IndexReader,
  IndexWriter,
  LossyPagingReader,
  LossyPostingsPage,
  LossyPostingsPageOptions,
  TokenStats,
} from "../types";

/**
 * In-memory backend combining lossy and exact indexes.
 */
export class FullTextMemoryBackend
  implements IndexReader, IndexWriter, LossyPagingReader, DocTokenBatchReader
{
  private lossyIndex = new LossyIndex();
  private exactIndex = new ExactIndex();
  private docTokenMembership = new Set<string>();

  private createMembershipKey(docId: DocId, indexField: string, token: string): string {
    return `${indexField}|${docId}|${token}`;
  }

  /**
   * Add a lossy posting for a token.
   * @param token Token value to add.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Promise resolved once posting is added.
   */
  async addLossyPosting(token: string, indexField: string, docId: DocId): Promise<void> {
    this.lossyIndex.addPosting(token, indexField, docId);
    this.docTokenMembership.add(this.createMembershipKey(docId, indexField, token));
  }

  /**
   * Remove a lossy posting for a token.
   * @param token Token value to remove.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Promise resolved once posting is removed.
   */
  async removeLossyPosting(token: string, indexField: string, docId: DocId): Promise<void> {
    this.lossyIndex.removePosting(token, indexField, docId);
    this.docTokenMembership.delete(this.createMembershipKey(docId, indexField, token));
  }

  /**
   * Load lossy postings for a token.
   * @param token Token value to load postings for.
   * @param indexField Field name the token was indexed under.
   * @returns Document ids containing the token.
   */
  async loadLossyPostings(token: string, indexField: string): Promise<DocId[]> {
    return this.lossyIndex.getPostings(token, indexField).docIds;
  }

  /**
   * Query a page of lossy postings for a token.
   * @param token Token value to query postings for.
   * @param indexField Field name the token was indexed under.
   * @param options Paging options for the query.
   * @returns Postings page with optional cursor.
   */
  async queryLossyPostingsPage(
    token: string,
    indexField: string,
    options: LossyPostingsPageOptions = {},
  ): Promise<LossyPostingsPage> {
    const { docIds, nextCursor } = this.lossyIndex.getPostings(token, indexField, {
      limit: options.limit,
      lastDocId: options.exclusiveStartDocId,
    });

    return { docIds, lastEvaluatedDocId: nextCursor };
  }

  /**
   * Add exact token positions for a document.
   * @param token Token value to store positions for.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @param positions Token positions within the document.
   * @returns Promise resolved once positions are stored.
   */
  async addExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
    positions: number[],
  ): Promise<void> {
    this.exactIndex.addPositions(token, indexField, docId, positions);
    this.docTokenMembership.add(this.createMembershipKey(docId, indexField, token));
  }

  /**
   * Remove exact token positions for a document.
   * @param token Token value to remove positions for.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Promise resolved once positions are removed.
   */
  async removeExactPositions(token: string, indexField: string, docId: DocId): Promise<void> {
    this.exactIndex.removePositions(token, indexField, docId);
    this.docTokenMembership.delete(this.createMembershipKey(docId, indexField, token));
  }

  /**
   * Load exact positions for a token in a document.
   * @param token Token value to load positions for.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Positions array or undefined when missing.
   */
  async loadExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<number[] | undefined> {
    const positions = this.exactIndex.getPositions(token, indexField, docId);
    return positions ? [...positions] : undefined;
  }

  /**
   * Batch load exact positions for token keys.
   * @param keys Token keys to load positions for.
   * @returns Positions arrays aligned with the input keys.
   */
  async batchLoadExactPositions(keys: DocTokenKey[]): Promise<(number[] | undefined)[]> {
    return keys.map((key) => {
      const positions = this.exactIndex.getPositions(key.token, key.indexField, key.docId);
      return positions ? [...positions] : undefined;
    });
  }

  /**
   * Load token stats for a token.
   * @param token Token value to load stats for.
   * @param indexField Field name the token was indexed under.
   * @returns Token stats or undefined when no postings exist.
   */
  async loadTokenStats(token: string, indexField: string): Promise<TokenStats | undefined> {
    const postings = this.lossyIndex.getPostings(token, indexField);
    return postings.docIds.length > 0 ? { df: postings.docIds.length, version: 1 } : undefined;
  }

  /**
   * Check whether a document contains a token.
   * @param docId Document id to check.
   * @param indexField Field name the token was indexed under.
   * @param token Token value to check.
   * @returns True when the document contains the token.
   */
  async hasDocToken(docId: DocId, indexField: string, token: string): Promise<boolean> {
    return this.docTokenMembership.has(this.createMembershipKey(docId, indexField, token));
  }

  /**
   * Batch check whether documents contain tokens.
   * @param keys Token keys to check.
   * @returns Booleans aligned with the input keys.
   */
  async batchHasDocTokens(keys: DocTokenKey[]): Promise<boolean[]> {
    return keys.map((key) =>
      this.docTokenMembership.has(this.createMembershipKey(key.docId, key.indexField, key.token)),
    );
  }
}
