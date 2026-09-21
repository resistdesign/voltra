/**
 * @packageDocumentation
 *
 * In-memory fulltext backend that combines lossy and exact indexes plus
 * doc-token membership checks. Useful for tests and local development.
 */
import { ExactIndex } from "./ExactIndex";
import { LossyIndex } from "./LossyIndex";
import { tokenize } from "../../../../Indexing/tokenize";
import {
  FullTextIndexWriter,
  type FullTextDocumentMutation,
  type FullTextDocumentState,
} from "../../../../Indexing/fulltext/FullTextIndexWriter";
import {
  decodeIndexScalarIdentity,
  encodeIndexScalarIdentity,
} from "../../../../Indexing/IndexTable";
import type {
  DocId,
  DocTokenBatchReader,
  DocTokenKey,
  IndexReader,
  IndexWriter,
  LossyPagingReader,
  LossyPostingsPage,
  LossyPostingsPageOptions,
  TextIndexDocumentListOptions,
  TextIndexDocumentPage,
  TokenStats,
} from "../../../../Indexing/Types";

/**
 * In-memory backend combining lossy and exact indexes.
 */
export class FullTextMemoryBackend
  implements IndexReader, IndexWriter, LossyPagingReader, DocTokenBatchReader
{
  private LossyIndex = new LossyIndex();
  private ExactIndex = new ExactIndex();
  private docTokenMembership = new Set<string>();
  private readonly documentWriter: FullTextIndexWriter;

  constructor() {
    this.documentWriter = new FullTextIndexWriter({
      loadDocumentContent: (docId, indexField) =>
        this.readDocumentIndex(docId, indexField),
      loadDocumentArtifacts: async (
        docId,
        indexField,
        candidates,
      ): Promise<FullTextDocumentState> => {
        const lossyTokens = candidates.lossyTokens.filter((token) =>
          this.LossyIndex.getPostings(token, indexField).docIds.includes(docId),
        );
        const exactTokens = candidates.exactTokens.flatMap((token) => {
          const positions = this.ExactIndex.getPositions(
            token,
            indexField,
            docId,
          );
          return positions ? [{ token, positions: [...positions] }] : [];
        });
        return { lossyTokens, exactTokens };
      },
      applyDocumentMutation: (docId, indexField, mutation) =>
        this.applyDocumentMutation(docId, indexField, mutation),
    });
  }

  private createMembershipKey(
    docId: DocId,
    indexField: string,
    token: string,
  ): string {
    return JSON.stringify([
      encodeIndexScalarIdentity(docId),
      indexField,
      token,
    ]);
  }

  private syncMembership(
    docId: DocId,
    indexField: string,
    token: string,
  ): void {
    const key = this.createMembershipKey(docId, indexField, token);
    const inLossy = this.LossyIndex.getPostings(token, indexField).docIds.includes(
      docId,
    );
    const inExact = !!this.ExactIndex.getPositions(token, indexField, docId);
    if (inLossy || inExact) {
      this.docTokenMembership.add(key);
    } else {
      this.docTokenMembership.delete(key);
    }
  }

  private async applyDocumentMutation(
    docId: DocId,
    indexField: string,
    mutation: FullTextDocumentMutation,
  ): Promise<void> {
    const affected = new Set<string>();

    for (const token of mutation.removeLossyTokens) {
      this.LossyIndex.removePosting(token, indexField, docId);
      affected.add(token);
    }
    for (const token of mutation.addLossyTokens) {
      this.LossyIndex.addPosting(token, indexField, docId);
      affected.add(token);
    }
    for (const token of mutation.removeExactTokens) {
      this.ExactIndex.removePositions(token, indexField, docId);
      affected.add(token);
    }
    for (const { token, positions } of mutation.putExactTokens) {
      this.ExactIndex.addPositions(token, indexField, docId, positions);
      affected.add(token);
    }

    for (const token of mutation.removeMembershipTokens) {
      this.docTokenMembership.delete(
        this.createMembershipKey(docId, indexField, token),
      );
    }
    for (const token of mutation.addMembershipTokens) {
      this.docTokenMembership.add(
        this.createMembershipKey(docId, indexField, token),
      );
    }

    // Preserve membership for tokens whose exact/lossy representation changed
    // without changing union membership.
    for (const token of affected) {
      if (
        !mutation.removeMembershipTokens.includes(token) &&
        !mutation.addMembershipTokens.includes(token)
      ) {
        this.syncMembership(docId, indexField, token);
      }
    }
  }

  /** Apply generic full-text document semantics to in-memory persistence. */
  async writeDocument(
    document: Record<string, unknown>,
    primaryField: string,
    indexField: string,
    indexFieldQualified = indexField,
    previousDocument?: Record<string, unknown>,
  ): Promise<void> {
    await this.documentWriter.writeDocument(
      document,
      primaryField,
      indexField,
      indexFieldQualified,
      previousDocument,
    );
  }

  /**
   * Add a lossy posting for a token.
   * @param token Token value to add.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Promise resolved once posting is added.
   */
  async addLossyPosting(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<void> {
    this.LossyIndex.addPosting(token, indexField, docId);
    this.syncMembership(docId, indexField, token);
  }

  /**
   * Remove a lossy posting for a token.
   * @param token Token value to remove.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Promise resolved once posting is removed.
   */
  async removeLossyPosting(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<void> {
    this.LossyIndex.removePosting(token, indexField, docId);
    this.syncMembership(docId, indexField, token);
  }

  /**
   * Load lossy postings for a token.
   * @param token Token value to load postings for.
   * @param indexField Field name the token was indexed under.
   * @returns Document ids containing the token.
   */
  async loadLossyPostings(token: string, indexField: string): Promise<DocId[]> {
    return this.LossyIndex.getPostings(token, indexField).docIds;
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
    const { docIds, nextCursor } = this.LossyIndex.getPostings(
      token,
      indexField,
      {
        limit: options.limit,
        lastDocId: options.exclusiveStartDocId,
      },
    );

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
    this.ExactIndex.addPositions(token, indexField, docId, positions);
    this.syncMembership(docId, indexField, token);
  }

  /**
   * Remove exact token positions for a document.
   * @param token Token value to remove positions for.
   * @param indexField Field name the token was indexed under.
   * @param docId Document id containing the token.
   * @returns Promise resolved once positions are removed.
   */
  async removeExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<void> {
    this.ExactIndex.removePositions(token, indexField, docId);
    this.syncMembership(docId, indexField, token);
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
    const positions = this.ExactIndex.getPositions(token, indexField, docId);
    return positions ? [...positions] : undefined;
  }

  /**
   * Batch load exact positions for token keys.
   * @param keys Token keys to load positions for.
   * @returns Positions arrays aligned with the input keys.
   */
  async batchLoadExactPositions(
    keys: DocTokenKey[],
  ): Promise<(number[] | undefined)[]> {
    return keys.map((key) => {
      const positions = this.ExactIndex.getPositions(
        key.token,
        key.indexField,
        key.docId,
      );
      return positions ? [...positions] : undefined;
    });
  }

  /**
   * Load token stats for a token.
   * @param token Token value to load stats for.
   * @param indexField Field name the token was indexed under.
   * @returns Token stats or undefined when no postings exist.
   */
  async loadTokenStats(
    token: string,
    indexField: string,
  ): Promise<TokenStats | undefined> {
    const postings = this.LossyIndex.getPostings(token, indexField);
    return postings.docIds.length > 0
      ? { df: postings.docIds.length, version: 1 }
      : undefined;
  }

  /**
   * Check whether a document contains a token.
   * @param docId Document id to check.
   * @param indexField Field name the token was indexed under.
   * @param token Token value to check.
   * @returns True when the document contains the token.
   */
  async hasDocToken(
    docId: DocId,
    indexField: string,
    token: string,
  ): Promise<boolean> {
    return this.docTokenMembership.has(
      this.createMembershipKey(docId, indexField, token),
    );
  }

  /**
   * Batch check whether documents contain tokens.
   * @param keys Token keys to check.
   * @returns Booleans aligned with the input keys.
   */
  async batchHasDocTokens(keys: DocTokenKey[]): Promise<boolean[]> {
    return keys.map((key) =>
      this.docTokenMembership.has(
        this.createMembershipKey(key.docId, key.indexField, key.token),
      ),
    );
  }

  /**
   * Enumerate indexed document/field pairs for bounded maintenance.
   * @param options Paging options.
   * @returns A deterministic page of text-index document mirrors.
   */
  async listDocuments(
    options: TextIndexDocumentListOptions = {},
  ): Promise<TextIndexDocumentPage> {
    const pairs = new Map<
      string,
      { docId: DocId; indexField: string; identity: string }
    >();

    for (const key of this.docTokenMembership) {
      const parsed = JSON.parse(key) as [string, string, string];
      const [encodedDocId, indexField] = parsed;
      const identity = JSON.stringify([encodedDocId, indexField]);
      if (!pairs.has(identity)) {
        pairs.set(identity, {
          docId: decodeIndexScalarIdentity(encodedDocId),
          indexField,
          identity,
        });
      }
    }

    const ordered = Array.from(pairs.values()).sort((left, right) =>
      left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0,
    );
    const start = options.cursor
      ? Math.max(
          0,
          ordered.findIndex((entry) => entry.identity === options.cursor) + 1,
        )
      : 0;
    const limit = Math.max(1, options.limit ?? 100);
    const page = ordered.slice(start, start + limit);
    const last = page[page.length - 1];

    return {
      documents: page.map(({ docId, indexField }) => ({ docId, indexField })),
      ...(last && start + page.length < ordered.length
        ? { cursor: last.identity }
        : {}),
    };
  }

  /**
   * Read normalized indexed content reconstructed from exact token positions.
   * @param docId Document id to inspect.
   * @param indexField Fully qualified persisted index field.
   * @returns Normalized indexed content, or undefined when missing.
   */
  async readDocumentIndex(
    docId: DocId,
    indexField: string,
  ): Promise<string | undefined> {
    const encodedDocId = encodeIndexScalarIdentity(docId);
    const tokens = new Set<string>();

    for (const key of this.docTokenMembership) {
      const parsed = JSON.parse(key) as [string, string, string];
      if (parsed[0] === encodedDocId && parsed[1] === indexField) {
        tokens.add(parsed[2]);
      }
    }

    const byPosition = new Map<number, string>();
    for (const token of tokens) {
      const positions = this.ExactIndex.getPositions(token, indexField, docId);
      if (!positions) {
        continue;
      }
      for (const position of positions) {
        byPosition.set(position, token);
      }
    }

    if (byPosition.size === 0) {
      return undefined;
    }

    const normalized = Array.from(byPosition.entries())
      .sort(([left], [right]) => left - right)
      .map(([, token]) => token)
      .join(" ");

    return tokenize(normalized).normalized || undefined;
  }

  /**
   * Remove every in-memory text-index artifact for one document/field pair.
   * @param docId Document id to clean.
   * @param indexField Fully qualified persisted index field.
   * @returns Promise resolved when cleanup is complete.
   */
  async removeDocumentIndex(
    docId: DocId,
    indexField: string,
  ): Promise<void> {
    const encodedDocId = encodeIndexScalarIdentity(docId);
    const matching: Array<{ key: string; token: string }> = [];

    for (const key of this.docTokenMembership) {
      const parsed = JSON.parse(key) as [string, string, string];
      if (parsed[0] === encodedDocId && parsed[1] === indexField) {
        matching.push({ key, token: parsed[2] });
      }
    }

    for (const { key, token } of matching) {
      this.LossyIndex.removePosting(token, indexField, docId);
      this.ExactIndex.removePositions(token, indexField, docId);
      this.docTokenMembership.delete(key);
    }
  }
}
