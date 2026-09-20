/**
 * Full-text indexing persistence for the S3 driver.
 *
 * Tokenization, document diffing, search semantics, and maintenance contracts
 * come from generic Indexing. This module only maps those primitives to S3
 * object storage.
 */
import {
  FullTextIndexWriter,
  planFullTextDocumentMutation,
  type FullTextDocumentMutation,
  type FullTextDocumentState,
} from "../../../../Indexing/fulltext/FullTextIndexWriter";
import {
  buildIndexDocumentSortKey,
  decodeIndexDocumentSortKey,
} from "../../../../Indexing/IndexTable";
import type {
  DocId,
  DocTokenBatchReader,
  DocTokenKey,
  DocumentRecord,
  ExactBatchReader,
  IndexReader,
  IndexWriter,
  LossyPagingReader,
  LossyPostingsPage,
  LossyPostingsPageOptions,
  TextIndexDocumentListOptions,
  TextIndexDocumentPage,
  TokenStats,
} from "../../../../Indexing/Types";
import type { SearchTrace } from "../../../../Indexing/Trace";
import type { S3IndexObjectStore } from "./S3IndexObjectStore";

type LossyPosting = { docId: DocId };
type ExactPosting = { docId: DocId; positions: number[] };
type TokenStatsRecord = { df: number; version: number };
type StoredDocumentState = FullTextDocumentState & {
  docId: DocId;
  indexField: string;
};

export type FullTextS3BackendConfig = {
  store: S3IndexObjectStore;
};

const segment = (value: string): string => encodeURIComponent(value);
const docSegment = (docId: DocId): string =>
  segment(buildIndexDocumentSortKey(docId));

const decodeDocSegment = (value: string): DocId => {
  const clean = value.endsWith(".json") ? value.slice(0, -5) : value;
  return decodeIndexDocumentSortKey(decodeURIComponent(clean));
};

const lossyPrefix = (indexField: string, token: string): string =>
  `fulltext/lossy/${segment(indexField)}/${segment(token)}/`;
const lossyKey = (
  indexField: string,
  token: string,
  docId: DocId,
): string => `${lossyPrefix(indexField, token)}${docSegment(docId)}.json`;

const exactPrefix = (indexField: string, token: string): string =>
  `fulltext/exact/${segment(indexField)}/${segment(token)}/`;
const exactKey = (
  indexField: string,
  token: string,
  docId: DocId,
): string => `${exactPrefix(indexField, token)}${docSegment(docId)}.json`;

const statePrefix = "fulltext/state/";
const stateKey = (indexField: string, docId: DocId): string =>
  `${statePrefix}${segment(indexField)}/${docSegment(docId)}.json`;

const statsKey = (indexField: string, token: string): string =>
  `fulltext/stats/${segment(indexField)}/${segment(token)}.json`;

const parsePostingDocId = (prefix: string, key: string): DocId =>
  decodeDocSegment(key.slice(prefix.length));

const cloneState = (state: FullTextDocumentState): FullTextDocumentState => ({
  ...(state.normalizedContent
    ? { normalizedContent: state.normalizedContent }
    : {}),
  lossyTokens: [...state.lossyTokens],
  exactTokens: state.exactTokens.map(({ token, positions }) => ({
    token,
    positions: [...positions],
  })),
});

const applyMutationToState = (
  previous: FullTextDocumentState,
  mutation: FullTextDocumentMutation,
): FullTextDocumentState => {
  const lossy = new Set(previous.lossyTokens);
  for (const token of mutation.removeLossyTokens) {
    lossy.delete(token);
  }
  for (const token of mutation.addLossyTokens) {
    lossy.add(token);
  }

  const exact = new Map(
    previous.exactTokens.map(({ token, positions }) => [
      token,
      [...positions],
    ]),
  );
  for (const token of mutation.removeExactTokens) {
    exact.delete(token);
  }
  for (const { token, positions } of mutation.putExactTokens) {
    exact.set(token, [...positions]);
  }

  return {
    ...(mutation.normalizedContent
      ? { normalizedContent: mutation.normalizedContent }
      : {}),
    lossyTokens: Array.from(lossy),
    exactTokens: Array.from(exact, ([token, positions]) => ({
      token,
      positions,
    })),
  };
};

/** S3 implementation of the generic full-text indexing contracts. */
export class FullTextS3Backend
  implements
    IndexReader,
    IndexWriter,
    LossyPagingReader,
    DocTokenBatchReader,
    ExactBatchReader
{
  private readonly store: S3IndexObjectStore;
  private readonly documentWriter: FullTextIndexWriter;
  private activeTrace?: SearchTrace;

  constructor(config: FullTextS3BackendConfig) {
    this.store = config.store;
    this.documentWriter = new FullTextIndexWriter({
      loadDocumentContent: async (docId, indexField) =>
        (await this.loadState(docId, indexField))?.normalizedContent,
      loadDocumentArtifacts: async (
        docId,
        indexField,
        candidates,
      ): Promise<FullTextDocumentState> => {
        const lossyTokens: string[] = [];
        const exactTokens: Array<{ token: string; positions: number[] }> = [];

        for (const token of candidates.lossyTokens) {
          if (await this.store.get(lossyKey(indexField, token, docId))) {
            lossyTokens.push(token);
          }
        }
        for (const token of candidates.exactTokens) {
          const posting = await this.store.get<ExactPosting>(
            exactKey(indexField, token, docId),
          );
          if (posting) {
            exactTokens.push({
              token,
              positions: [...posting.value.positions],
            });
          }
        }
        return { lossyTokens, exactTokens };
      },
      applyDocumentMutation: (docId, indexField, mutation) =>
        this.applyDocumentMutation(docId, indexField, mutation),
    });
  }

  setActiveTrace(trace: SearchTrace | undefined): void {
    this.activeTrace = trace;
  }

  private recordQuery(): void {
    if (this.activeTrace) {
      this.activeTrace.storageQueryCalls += 1;
    }
  }

  private recordRead(count = 1): void {
    if (this.activeTrace) {
      this.activeTrace.storageItemReadCalls += count;
    }
  }

  private async loadState(
    docId: DocId,
    indexField: string,
  ): Promise<StoredDocumentState | undefined> {
    this.recordRead();
    return (await this.store.get<StoredDocumentState>(
      stateKey(indexField, docId),
    ))?.value;
  }

  private async updateTokenStats(
    indexField: string,
    token: string,
    delta: number,
  ): Promise<void> {
    const key = statsKey(indexField, token);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const current = await this.store.get<TokenStatsRecord>(key);
      const nextDf = Math.max(0, (current?.value.df ?? 0) + delta);
      if (nextDf === 0) {
        if (current) {
          await this.store.delete(key);
        }
        return;
      }
      const result = await this.store.put(
        key,
        {
          df: nextDf,
          version: (current?.value.version ?? 0) + 1,
        } satisfies TokenStatsRecord,
        current?.etag
          ? { ifMatch: current.etag }
          : { ifNoneMatch: true },
      );
      if (!result.conditionFailed) {
        return;
      }
    }
    throw new Error("S3 full-text token stats update retries exceeded.");
  }

  private async addLossyPostingIfMissing(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<void> {
    const result = await this.store.put(
      lossyKey(indexField, token, docId),
      { docId } satisfies LossyPosting,
      { ifNoneMatch: true },
    );
    if (!result.conditionFailed) {
      await this.updateTokenStats(indexField, token, 1);
    }
  }

  private async removeLossyPostingIfPresent(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<void> {
    const key = lossyKey(indexField, token, docId);
    const current = await this.store.get(key);
    if (!current) {
      return;
    }
    await this.store.delete(key);
    await this.updateTokenStats(indexField, token, -1);
  }

  private async applyDocumentMutation(
    docId: DocId,
    indexField: string,
    mutation: FullTextDocumentMutation,
  ): Promise<void> {
    const previous =
      (await this.loadState(docId, indexField)) ?? {
        lossyTokens: [],
        exactTokens: [],
      };

    for (const token of mutation.removeLossyTokens) {
      await this.removeLossyPostingIfPresent(token, indexField, docId);
    }
    for (const token of mutation.addLossyTokens) {
      await this.addLossyPostingIfMissing(token, indexField, docId);
    }
    for (const token of mutation.removeExactTokens) {
      await this.store.delete(exactKey(indexField, token, docId));
    }
    for (const { token, positions } of mutation.putExactTokens) {
      await this.store.put(exactKey(indexField, token, docId), {
        docId,
        positions: [...positions],
      } satisfies ExactPosting);
    }

    const next = applyMutationToState(previous, mutation);
    const key = stateKey(indexField, docId);
    if (
      !next.normalizedContent &&
      next.lossyTokens.length === 0 &&
      next.exactTokens.length === 0
    ) {
      await this.store.delete(key);
    } else {
      await this.store.put(key, {
        ...cloneState(next),
        docId,
        indexField,
      } satisfies StoredDocumentState);
    }
  }

  async writeDocument(
    document: DocumentRecord,
    primaryField: string,
    indexField: string,
    indexFieldQualified = indexField,
    previousDocument?: DocumentRecord,
  ): Promise<void> {
    await this.documentWriter.writeDocument(
      document,
      primaryField,
      indexField,
      indexFieldQualified,
      previousDocument,
    );
  }

  async addLossyPosting(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<void> {
    await this.addLossyPostingIfMissing(token, indexField, docId);
  }

  async removeLossyPosting(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<void> {
    await this.removeLossyPostingIfPresent(token, indexField, docId);
  }

  async queryLossyPostingsPage(
    token: string,
    indexField: string,
    options: LossyPostingsPageOptions = {},
  ): Promise<LossyPostingsPage> {
    this.recordQuery();
    const prefix = lossyPrefix(indexField, token);
    const page = await this.store.list(prefix, {
      limit: options.limit,
      cursor: options.exclusiveStartDocId
        ? lossyKey(indexField, token, options.exclusiveStartDocId)
        : undefined,
    });
    return {
      docIds: page.keys.map((key) => parsePostingDocId(prefix, key)),
      ...(page.cursor
        ? {
            lastEvaluatedDocId: parsePostingDocId(prefix, page.cursor),
          }
        : {}),
    };
  }

  async loadLossyPostings(
    token: string,
    indexField: string,
  ): Promise<DocId[]> {
    const docIds: DocId[] = [];
    let exclusiveStartDocId: DocId | undefined;
    do {
      const page = await this.queryLossyPostingsPage(token, indexField, {
        limit: 250,
        exclusiveStartDocId,
      });
      docIds.push(...page.docIds);
      exclusiveStartDocId = page.lastEvaluatedDocId;
    } while (exclusiveStartDocId !== undefined);
    return docIds;
  }

  async addExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
    positions: number[],
  ): Promise<void> {
    await this.store.put(exactKey(indexField, token, docId), {
      docId,
      positions: [...positions],
    } satisfies ExactPosting);
  }

  async removeExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<void> {
    await this.store.delete(exactKey(indexField, token, docId));
  }

  async loadExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<number[] | undefined> {
    this.recordRead();
    const posting = await this.store.get<ExactPosting>(
      exactKey(indexField, token, docId),
    );
    return posting ? [...posting.value.positions] : undefined;
  }

  async batchLoadExactPositions(
    keys: DocTokenKey[],
  ): Promise<(number[] | undefined)[]> {
    return Promise.all(
      keys.map(({ token, indexField, docId }) =>
        this.loadExactPositions(token, indexField, docId),
      ),
    );
  }

  async loadTokenStats(
    token: string,
    indexField: string,
  ): Promise<TokenStats | undefined> {
    this.recordRead();
    const record = await this.store.get<TokenStatsRecord>(
      statsKey(indexField, token),
    );
    return record
      ? { df: record.value.df, version: record.value.version }
      : undefined;
  }

  async hasDocToken(
    docId: DocId,
    indexField: string,
    token: string,
  ): Promise<boolean> {
    this.recordRead(2);
    const [lossy, exact] = await Promise.all([
      this.store.get(lossyKey(indexField, token, docId)),
      this.store.get(exactKey(indexField, token, docId)),
    ]);
    return !!lossy || !!exact;
  }

  async batchHasDocTokens(keys: DocTokenKey[]): Promise<boolean[]> {
    return Promise.all(
      keys.map(({ docId, indexField, token }) =>
        this.hasDocToken(docId, indexField, token),
      ),
    );
  }

  async listDocuments(
    options: TextIndexDocumentListOptions = {},
  ): Promise<TextIndexDocumentPage> {
    this.recordQuery();
    const page = await this.store.list(statePrefix, {
      limit: options.limit,
      cursor: options.cursor,
    });
    const values = await Promise.all(
      page.keys.map((key) => this.store.get<StoredDocumentState>(key)),
    );
    return {
      documents: values.flatMap((entry) =>
        entry
          ? [{
              docId: entry.value.docId,
              indexField: entry.value.indexField,
            }]
          : [],
      ),
      ...(page.cursor ? { cursor: page.cursor } : {}),
    };
  }

  async readDocumentIndex(
    docId: DocId,
    indexField: string,
  ): Promise<string | undefined> {
    return (await this.loadState(docId, indexField))?.normalizedContent;
  }

  async removeDocumentIndex(
    docId: DocId,
    indexField: string,
  ): Promise<void> {
    const current = await this.loadState(docId, indexField);
    if (!current) {
      return;
    }
    await this.applyDocumentMutation(
      docId,
      indexField,
      planFullTextDocumentMutation(current, {
        lossyTokens: [],
        exactTokens: [],
      }),
    );
  }
}
