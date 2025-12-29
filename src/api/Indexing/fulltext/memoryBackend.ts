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

export class FullTextMemoryBackend
  implements IndexReader, IndexWriter, LossyPagingReader, DocTokenBatchReader
{
  private lossyIndex = new LossyIndex();
  private exactIndex = new ExactIndex();
  private docTokenMembership = new Set<string>();

  private createMembershipKey(docId: DocId, indexField: string, token: string): string {
    return `${indexField}|${docId}|${token}`;
  }

  async addLossyPosting(token: string, indexField: string, docId: DocId): Promise<void> {
    this.lossyIndex.addPosting(token, indexField, docId);
    this.docTokenMembership.add(this.createMembershipKey(docId, indexField, token));
  }

  async removeLossyPosting(token: string, indexField: string, docId: DocId): Promise<void> {
    this.lossyIndex.removePosting(token, indexField, docId);
    this.docTokenMembership.delete(this.createMembershipKey(docId, indexField, token));
  }

  async loadLossyPostings(token: string, indexField: string): Promise<DocId[]> {
    return this.lossyIndex.getPostings(token, indexField).docIds;
  }

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

  async addExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
    positions: number[],
  ): Promise<void> {
    this.exactIndex.addPositions(token, indexField, docId, positions);
    this.docTokenMembership.add(this.createMembershipKey(docId, indexField, token));
  }

  async removeExactPositions(token: string, indexField: string, docId: DocId): Promise<void> {
    this.exactIndex.removePositions(token, indexField, docId);
    this.docTokenMembership.delete(this.createMembershipKey(docId, indexField, token));
  }

  async loadExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<number[] | undefined> {
    const positions = this.exactIndex.getPositions(token, indexField, docId);
    return positions ? [...positions] : undefined;
  }

  async batchLoadExactPositions(keys: DocTokenKey[]): Promise<(number[] | undefined)[]> {
    return keys.map((key) => {
      const positions = this.exactIndex.getPositions(key.token, key.indexField, key.docId);
      return positions ? [...positions] : undefined;
    });
  }

  async loadTokenStats(token: string, indexField: string): Promise<TokenStats | undefined> {
    const postings = this.lossyIndex.getPostings(token, indexField);
    return postings.docIds.length > 0 ? { df: postings.docIds.length, version: 1 } : undefined;
  }

  async hasDocToken(docId: DocId, indexField: string, token: string): Promise<boolean> {
    return this.docTokenMembership.has(this.createMembershipKey(docId, indexField, token));
  }

  async batchHasDocTokens(keys: DocTokenKey[]): Promise<boolean[]> {
    return keys.map((key) =>
      this.docTokenMembership.has(this.createMembershipKey(key.docId, key.indexField, key.token)),
    );
  }
}
