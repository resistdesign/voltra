/**
 * @packageDocumentation
 *
 * DynamoDB-backed fulltext indexing. Uses namespaced lossy/exact postings,
 * document mirrors, and token statistics in one table to support fast search with
 * cursor-based paging.
 */
import {
  FullTextIndexWriter,
  type FullTextDocumentMutation,
  type FullTextDocumentState,
} from "../../../../Indexing/fulltext/FullTextIndexWriter";
import type {
  DocId,
  DocTokenKey,
  DocumentRecord,
  TextIndexDocumentListOptions,
  TextIndexDocumentPage,
  TokenStats,
} from "../../../../Indexing/Types";
import type { SearchTrace } from "../../../../Indexing/Trace";
import { normalizeDocId } from "../../../../Indexing/docId";
import {
  docTokenPositionsSchema,
  docTokensSchema,
  encodeDocKey,
  encodeDocMirrorKey,
  encodeDocMirrorSortKey,
  encodeDocTokenSortKey,
  encodeTokenDocSortKey,
  encodeTokenKey,
  exactPostingsSchema,
  fullTextDocMirrorSchema,
  FULL_TEXT_TOKEN_STATS_SORT_KEY,
  fullTextTokenStatsSchema,
  lossyPostingsSchema,
} from "./FullTextSchema";
import {
  INDEX_ITEM_KINDS,
  INDEX_KEY_PARTS,
  INDEX_KEY_SEPARATOR,
  INDEX_KEY_VERSION,
  decodeIndexDocumentSortKey,
  decodeIndexIdentity,
  decodeIndexScalarIdentity,
} from "../../../../Indexing/IndexTable";
import {
  INDEX_TABLE_KIND_ATTRIBUTE,
  assertIndexTableConfig,
  type IndexTableConfig,
} from "./IndexTable";
import { IndexMutationCoordinator } from "./IndexMutationCoordinator";
import type {
  DynamoBatchWriter,
  DynamoQueryClient,
  KeysAndAttributes,
  WriteRequest,
} from "./Types";
export * from "./Types";

/**
 * @deprecated Use {@link IndexTableConfig}. All full-text records share one table.
 */
export type FullTextTableNames = IndexTableConfig;

/**
 * Configuration for the DynamoDB fulltext writer.
 *
 * One table name is required and should be injected per deployment.
 */
export type FullTextDdbWriterConfig = {
  /**
   * DynamoDB client used for batch writes and gets.
   */
  client: DynamoBatchWriter;
  /**
   * Unified table for fulltext indexing storage.
   */
  table: IndexTableConfig;
  /** Shared coordinator for compatible derived writes. */
  mutationCoordinator?: IndexMutationCoordinator;
};

type TableWrite = {
  tableName: string;
  request: WriteRequest;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function decodeDocKey(value: unknown): DocId | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    return decodeIndexDocumentSortKey(value);
  } catch (_error) {
    return undefined;
  }
}

function buildDocTokenItemKey(partitionKey: string, sortKey: string): string {
  return `${partitionKey}|${sortKey}`;
}

function decodeMirrorDocumentId(value: unknown): DocId | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const prefix = [
    INDEX_KEY_VERSION,
    INDEX_ITEM_KINDS.fullTextDocumentMirror,
    INDEX_KEY_PARTS.document,
  ].join(INDEX_KEY_SEPARATOR) + INDEX_KEY_SEPARATOR;

  if (!value.startsWith(prefix)) {
    return undefined;
  }

  try {
    return decodeIndexScalarIdentity(value.slice(prefix.length));
  } catch (_error) {
    return undefined;
  }
}

function decodeMirrorIndexField(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const prefix = `${INDEX_KEY_PARTS.field}${INDEX_KEY_SEPARATOR}`;
  if (!value.startsWith(prefix)) {
    return undefined;
  }

  try {
    return decodeIndexIdentity(value.slice(prefix.length));
  } catch (_error) {
    return undefined;
  }
}

function decodeMaintenanceCursor(
  cursor?: string,
): Record<string, unknown> | undefined {
  if (!cursor) {
    return undefined;
  }

  try {
    const value = JSON.parse(cursor) as Record<string, unknown>;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error();
    }
    return value;
  } catch (_error) {
    throw new Error("Invalid full-text maintenance cursor.");
  }
}

function encodeMaintenanceCursor(
  key?: Record<string, unknown>,
): string | undefined {
  return key ? JSON.stringify(key) : undefined;
}

/**
 * Write-only DynamoDB helper for indexing documents and token stats.
 */
export class FullTextDdbWriter {
  protected client: DynamoBatchWriter;
  protected lossyTableName: string;
  protected exactTableName: string;
  protected mirrorTableName: string;
  protected docTokensTableName: string;
  protected docTokenPositionsTableName: string;
  protected tokenStatsTableName: string;
  protected mutationCoordinator: IndexMutationCoordinator;
  private readonly documentWriter: FullTextIndexWriter;

  /**
   * @param config Writer configuration including client and unified table.
   */
  constructor(config: FullTextDdbWriterConfig) {
    assertIndexTableConfig(config.table);
    this.client = config.client;
    this.lossyTableName = config.table.tableName;
    this.exactTableName = config.table.tableName;
    this.mirrorTableName = config.table.tableName;
    this.docTokensTableName = config.table.tableName;
    this.docTokenPositionsTableName = config.table.tableName;
    this.tokenStatsTableName = config.table.tableName;
    this.mutationCoordinator =
      config.mutationCoordinator ?? new IndexMutationCoordinator(config.client);
    this.documentWriter = new FullTextIndexWriter({
      loadDocumentContent: (docId, indexField) =>
        this.loadMirrorContent(docId, indexField),
      loadDocumentArtifacts: async (
        docId,
        indexField,
        candidates,
      ): Promise<FullTextDocumentState> => {
        const state = await this.loadPersistedIndexState(
          docId,
          indexField,
          candidates.lossyTokens,
          candidates.exactTokens,
        );
        return {
          lossyTokens: Array.from(state.lossyTokens),
          exactTokens: Array.from(
            state.positions,
            ([token, positions]) => ({ token, positions }),
          ),
        };
      },
      applyDocumentMutation: (docId, indexField, mutation) =>
        this.applyDocumentMutation(docId, indexField, mutation),
    });
  }

  /**
   * Build a token stats write request for a document frequency delta.
   * @param token Token value to update stats for.
   * @param indexField Field name the token was indexed under.
   * @param delta Delta to apply to document frequency.
   * @returns Write request or undefined when no update is needed.
   */
  protected async buildTokenStatsWrite(
    token: string,
    indexField: string,
    delta: number,
  ): Promise<TableWrite | undefined> {
    if (delta === 0) {
      return undefined;
    }

    const response = await this.client.getItem({
      TableName: this.tokenStatsTableName,
      Key: {
        [fullTextTokenStatsSchema.partitionKey]: encodeTokenKey(
          indexField,
          token,
          "stats",
        ),
        [fullTextTokenStatsSchema.sortKey]: FULL_TEXT_TOKEN_STATS_SORT_KEY,
      },
    });

    const rawDf =
      response.Item?.[fullTextTokenStatsSchema.documentFrequencyAttribute];
    const currentDf = typeof rawDf === "number" ? rawDf : 0;
    const nextDf = currentDf + delta;

    if (nextDf <= 0) {
      return {
        tableName: this.tokenStatsTableName,
        request: {
          DeleteRequest: {
            Key: {
              [fullTextTokenStatsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
                "stats",
              ),
              [fullTextTokenStatsSchema.sortKey]:
                FULL_TEXT_TOKEN_STATS_SORT_KEY,
            },
          },
        },
      };
    }

    return {
      tableName: this.tokenStatsTableName,
      request: {
        PutRequest: {
          Item: {
            [fullTextTokenStatsSchema.partitionKey]: encodeTokenKey(
              indexField,
              token,
              "stats",
            ),
            [fullTextTokenStatsSchema.sortKey]: FULL_TEXT_TOKEN_STATS_SORT_KEY,
            [INDEX_TABLE_KIND_ATTRIBUTE]: INDEX_ITEM_KINDS.fullTextTokenStats,
            [fullTextTokenStatsSchema.documentFrequencyAttribute]: nextDf,
          },
        },
      },
    };
  }

  protected async loadMirrorContent(
    docId: DocId,
    indexField: string,
  ): Promise<string | undefined> {
    const response = await this.client.getItem({
      TableName: this.mirrorTableName,
      Key: {
        [fullTextDocMirrorSchema.partitionKey]: encodeDocMirrorKey(
          indexField,
          docId,
        ),
        [fullTextDocMirrorSchema.sortKey]: encodeDocMirrorSortKey(indexField),
      },
    });

    const raw = response.Item?.[fullTextDocMirrorSchema.contentAttribute];
    return typeof raw === "string" ? raw : undefined;
  }

  private async loadPersistedIndexState(
    docId: DocId,
    indexField: string,
    lossyTokens: string[],
    exactTokens: string[],
  ): Promise<{
    lossyTokens: Set<string>;
    positions: Map<string, number[]>;
  }> {
    const keys: Record<string, unknown>[] = [];
    const keyTypes = new Map<
      string,
      { kind: "lossy" | "positions"; token: string }
    >();

    for (const token of new Set(lossyTokens)) {
      const key = {
        [docTokensSchema.partitionKey]: encodeDocKey(docId),
        [docTokensSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
      };
      keys.push(key);
      keyTypes.set(buildDocTokenItemKey(String(key.pk), String(key.sk)), {
        kind: "lossy",
        token,
      });
    }

    for (const token of new Set(exactTokens)) {
      const key = {
        [docTokenPositionsSchema.partitionKey]: encodeDocKey(
          docId,
          "positions",
        ),
        [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(
          indexField,
          token,
        ),
      };
      keys.push(key);
      keyTypes.set(buildDocTokenItemKey(String(key.pk), String(key.sk)), {
        kind: "positions",
        token,
      });
    }

    const persistedLossyTokens = new Set<string>();
    const persistedPositions = new Map<string, number[]>();

    for (const keyChunk of chunkArray(keys, 100)) {
      let unprocessed: Record<string, KeysAndAttributes> | undefined = {
        [this.docTokensTableName]: {
          Keys: keyChunk,
          ConsistentRead: true,
        },
      };

      while (unprocessed && Object.keys(unprocessed).length > 0) {
        const response = await this.client.batchGetItem({
          RequestItems: unprocessed,
        });

        for (const item of response.Responses?.[this.docTokensTableName] ?? []) {
          const partitionKey = item[docTokensSchema.partitionKey];
          const sortKey = item[docTokensSchema.sortKey];
          if (typeof partitionKey !== "string" || typeof sortKey !== "string") {
            continue;
          }

          const keyType = keyTypes.get(
            buildDocTokenItemKey(partitionKey, sortKey),
          );
          if (keyType?.kind === "lossy") {
            persistedLossyTokens.add(keyType.token);
          } else if (keyType?.kind === "positions") {
            const rawPositions =
              item[docTokenPositionsSchema.positionsAttribute];
            if (Array.isArray(rawPositions)) {
              persistedPositions.set(
                keyType.token,
                rawPositions.filter(
                  (value): value is number => typeof value === "number",
                ),
              );
            }
          }
        }

        unprocessed = response.UnprocessedKeys;
      }
    }

    return {
      lossyTokens: persistedLossyTokens,
      positions: persistedPositions,
    };
  }

  protected async applyDocumentMutation(
    docId: DocId,
    indexField: string,
    mutation: FullTextDocumentMutation,
  ): Promise<void> {
    const writes: TableWrite[] = [];
    const docKey = encodeDocKey(docId);
    const positionsDocKey = encodeDocKey(docId, "positions");

    const statWrites = await Promise.all([
      ...mutation.removeLossyTokens.map((token) =>
        this.buildTokenStatsWrite(token, indexField, -1),
      ),
      ...mutation.addLossyTokens.map((token) =>
        this.buildTokenStatsWrite(token, indexField, 1),
      ),
    ]);

    for (const token of mutation.removeLossyTokens) {
      writes.push({
        tableName: this.lossyTableName,
        request: {
          DeleteRequest: {
            Key: {
              [lossyPostingsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
              ),
              [lossyPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
            },
          },
        },
      });
      writes.push({
        tableName: this.docTokensTableName,
        request: {
          DeleteRequest: {
            Key: {
              [docTokensSchema.partitionKey]: docKey,
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
            },
          },
        },
      });
    }

    for (const token of mutation.addLossyTokens) {
      writes.push({
        tableName: this.lossyTableName,
        request: {
          PutRequest: {
            Item: {
              [INDEX_TABLE_KIND_ATTRIBUTE]:
                INDEX_ITEM_KINDS.fullTextLossyPosting,
              [lossyPostingsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
              ),
              [lossyPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
              [lossyPostingsSchema.docIdAttribute]: docId,
            },
          },
        },
      });
      writes.push({
        tableName: this.docTokensTableName,
        request: {
          PutRequest: {
            Item: {
              [INDEX_TABLE_KIND_ATTRIBUTE]:
                INDEX_ITEM_KINDS.fullTextDocumentToken,
              [docTokensSchema.partitionKey]: docKey,
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
            },
          },
        },
      });
    }

    for (const token of mutation.removeExactTokens) {
      writes.push({
        tableName: this.exactTableName,
        request: {
          DeleteRequest: {
            Key: {
              [exactPostingsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
                "exact",
              ),
              [exactPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
            },
          },
        },
      });
      writes.push({
        tableName: this.docTokenPositionsTableName,
        request: {
          DeleteRequest: {
            Key: {
              [docTokenPositionsSchema.partitionKey]: positionsDocKey,
              [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
            },
          },
        },
      });
    }

    for (const write of statWrites) {
      if (write) {
        writes.push(write);
      }
    }

    for (const { token, positions } of mutation.putExactTokens) {
      writes.push({
        tableName: this.exactTableName,
        request: {
          PutRequest: {
            Item: {
              [INDEX_TABLE_KIND_ATTRIBUTE]:
                INDEX_ITEM_KINDS.fullTextExactPosting,
              [exactPostingsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
                "exact",
              ),
              [exactPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
              [exactPostingsSchema.positionsAttribute]: [...positions],
            },
          },
        },
      });
      writes.push({
        tableName: this.docTokenPositionsTableName,
        request: {
          PutRequest: {
            Item: {
              [INDEX_TABLE_KIND_ATTRIBUTE]:
                INDEX_ITEM_KINDS.fullTextTokenPositions,
              [docTokenPositionsSchema.partitionKey]: positionsDocKey,
              [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
              [docTokenPositionsSchema.positionsAttribute]: [...positions],
            },
          },
        },
      });
    }

    const mirrorKey = {
      [fullTextDocMirrorSchema.partitionKey]: encodeDocMirrorKey(
        indexField,
        docId,
      ),
      [fullTextDocMirrorSchema.sortKey]: encodeDocMirrorSortKey(indexField),
    };
    writes.push({
      tableName: this.mirrorTableName,
      request: mutation.normalizedContent
        ? {
            PutRequest: {
              Item: {
                ...mirrorKey,
                [INDEX_TABLE_KIND_ATTRIBUTE]:
                  INDEX_ITEM_KINDS.fullTextDocumentMirror,
                [fullTextDocMirrorSchema.contentAttribute]:
                  mutation.normalizedContent,
              },
            },
          }
        : { DeleteRequest: { Key: mirrorKey } },
    });

    await this.mutationCoordinator.write(writes);
  }

  /**
   * Apply generic full-text document semantics through DynamoDB persistence.
   */
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

}

/**
 * Configuration for the DynamoDB fulltext backend.
 */
/**
 * Configuration for the combined fulltext backend.
 *
 * One table name is required and should be injected per deployment.
 */
export type FullTextDdbBackendConfig = FullTextDdbWriterConfig & {
  /**
   * DynamoDB client with query support.
   */
  client: DynamoQueryClient;
};

/**
 * Page of lossy postings results.
 */
type LossyPostingsPage = {
  /**
   * Document ids in the page.
   */
  docIds: DocId[];
  /**
   * Doc id used to resume paging, if more results exist.
   */
  lastEvaluatedDocId?: DocId;
};

/**
 * Paging options for lossy postings queries.
 */
type LossyPostingsPageOptions = {
  /**
   * Exclusive starting doc id for paging.
   */
  exclusiveStartDocId?: DocId;
  /**
   * Maximum number of doc ids to return.
   */
  limit?: number;
};

/**
 * Read/write DynamoDB backend that adds query helpers to {@link FullTextDdbWriter}.
 */
export class FullTextDdbBackend extends FullTextDdbWriter {
  private readonly queryClient: DynamoQueryClient;
  private activeTrace: SearchTrace | undefined;

  /**
   * @param config Backend configuration including query client and unified table.
   */
  constructor(config: FullTextDdbBackendConfig) {
    super(config);
    this.queryClient = config.client;
  }

  /**
   * Enumerate a bounded page of persisted full-text document mirrors.
   * @param options Paging options.
   * @returns Full-text document/field mirrors and continuation state.
   */
  async listDocuments(
    options: TextIndexDocumentListOptions = {},
  ): Promise<TextIndexDocumentPage> {
    if (!this.queryClient.scan) {
      throw new Error(
        "Full-text maintenance enumeration requires DynamoDB scan support.",
      );
    }

    const response = await this.queryClient.scan({
      TableName: this.mirrorTableName,
      FilterExpression: "#kind = :kind",
      ExpressionAttributeNames: {
        "#kind": INDEX_TABLE_KIND_ATTRIBUTE,
      },
      ExpressionAttributeValues: {
        ":kind": INDEX_ITEM_KINDS.fullTextDocumentMirror,
      },
      ExclusiveStartKey: decodeMaintenanceCursor(options.cursor),
      Limit: Math.max(1, options.limit ?? 100),
      ConsistentRead: true,
    });

    const documents = [];
    for (const item of response.Items ?? []) {
      const docId = decodeMirrorDocumentId(
        item[fullTextDocMirrorSchema.partitionKey],
      );
      const indexField = decodeMirrorIndexField(
        item[fullTextDocMirrorSchema.sortKey],
      );
      if (docId !== undefined && indexField !== undefined) {
        documents.push({ docId, indexField });
      }
    }

    return {
      documents,
      cursor: encodeMaintenanceCursor(response.LastEvaluatedKey),
    };
  }

  /**
   * Read the normalized persisted full-text mirror for maintenance.
   * @param docId Document id to inspect.
   * @param indexField Fully qualified persisted field.
   * @returns Normalized indexed content, or undefined when missing.
   */
  async readDocumentIndex(
    docId: DocId,
    indexField: string,
  ): Promise<string | undefined> {
    return this.loadMirrorContent(docId, indexField);
  }

  /**
   * Remove every persisted full-text artifact for one document/field pair.
   * @param docId Document id to clean.
   * @param indexField Fully qualified persisted field.
   * @returns Promise resolved when cleanup is complete.
   */
  async removeDocumentIndex(
    docId: DocId,
    indexField: string,
  ): Promise<void> {
    await this.writeDocument(
      { __healthDocId: docId, __healthContent: "" },
      "__healthDocId",
      "__healthContent",
      indexField,
    );
  }

  /**
   * Attach or clear an active search trace for metrics.
   * @param trace Trace instance to record metrics into.
   * @returns Nothing.
   */
  setActiveTrace(trace: SearchTrace | undefined): void {
    this.activeTrace = trace;
  }

  private recordQuery(): void {
    if (this.activeTrace) {
      this.activeTrace.storageQueryCalls += 1;
    }
  }

  private recordBatchGet(): void {
    if (this.activeTrace) {
      this.activeTrace.storageBatchReadCalls += 1;
    }
  }

  private recordItemRead(): void {
    if (this.activeTrace) {
      this.activeTrace.storageItemReadCalls += 1;
    }
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
    const docKey = encodeDocKey(docId);
    const writes: TableWrite[] = [
      {
        tableName: this.lossyTableName,
        request: {
          PutRequest: {
            Item: {
              [INDEX_TABLE_KIND_ATTRIBUTE]:
                INDEX_ITEM_KINDS.fullTextLossyPosting,
              [lossyPostingsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
              ),
              [lossyPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
              [lossyPostingsSchema.docIdAttribute]: docId,
            },
          },
        },
      },
      {
        tableName: this.docTokensTableName,
        request: {
          PutRequest: {
            Item: {
              [INDEX_TABLE_KIND_ATTRIBUTE]:
                INDEX_ITEM_KINDS.fullTextDocumentToken,
              [docTokensSchema.partitionKey]: docKey,
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
            },
          },
        },
      },
    ];

    const statWrite = await this.buildTokenStatsWrite(token, indexField, 1);
    if (statWrite) {
      writes.push(statWrite);
    }

    await this.mutationCoordinator.write(writes);
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
    const docKey = encodeDocKey(docId);
    const writes: TableWrite[] = [
      {
        tableName: this.lossyTableName,
        request: {
          DeleteRequest: {
            Key: {
              [lossyPostingsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
              ),
              [lossyPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
            },
          },
        },
      },
      {
        tableName: this.docTokensTableName,
        request: {
          DeleteRequest: {
            Key: {
              [docTokensSchema.partitionKey]: docKey,
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
            },
          },
        },
      },
    ];

    const statWrite = await this.buildTokenStatsWrite(token, indexField, -1);
    if (statWrite) {
      writes.push(statWrite);
    }

    await this.mutationCoordinator.write(writes);
  }

  /**
   * Load all lossy postings for a token.
   * @param token Token value to load postings for.
   * @param indexField Field name the token was indexed under.
   * @returns Document ids containing the token.
   */
  async loadLossyPostings(token: string, indexField: string): Promise<DocId[]> {
    const docIds: DocId[] = [];
    let exclusiveStartDocId: DocId | undefined;

    while (true) {
      const page = await this.queryLossyPostingsPage(token, indexField, {
        exclusiveStartDocId,
      });
      docIds.push(...page.docIds);

      if (page.lastEvaluatedDocId === undefined) {
        break;
      }

      exclusiveStartDocId = page.lastEvaluatedDocId;
    }

    return docIds;
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
    this.recordQuery();
    const response = await this.queryClient.query({
      TableName: this.lossyTableName,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: {
        "#pk": lossyPostingsSchema.partitionKey,
      },
      ExpressionAttributeValues: {
        ":pk": encodeTokenKey(indexField, token),
      },
      ExclusiveStartKey:
        options.exclusiveStartDocId !== undefined
          ? {
              [lossyPostingsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
              ),
              [lossyPostingsSchema.sortKey]: encodeTokenDocSortKey(
                options.exclusiveStartDocId,
              ),
            }
          : undefined,
      Limit: options.limit,
    });

    const docIds =
      response.Items?.map((item) => {
        const stored = item[lossyPostingsSchema.docIdAttribute];
        return typeof stored === "string" || typeof stored === "number"
          ? stored
          : decodeDocKey(item[lossyPostingsSchema.sortKey]);
      }).filter((docId): docId is DocId => docId !== undefined) ?? [];

    const lastEvaluatedDocId = response.LastEvaluatedKey
      ? (docIds[docIds.length - 1] ??
        decodeDocKey(response.LastEvaluatedKey[lossyPostingsSchema.sortKey]))
      : undefined;

    return { docIds, lastEvaluatedDocId };
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
    const docKey = encodeDocKey(docId);
    const positionsDocKey = encodeDocKey(docId, "positions");
    const writes: TableWrite[] = [
      {
        tableName: this.exactTableName,
        request: {
          PutRequest: {
            Item: {
              [INDEX_TABLE_KIND_ATTRIBUTE]:
                INDEX_ITEM_KINDS.fullTextExactPosting,
              [exactPostingsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
                "exact",
              ),
              [exactPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
              [exactPostingsSchema.positionsAttribute]: [...positions],
            },
          },
        },
      },
      {
        tableName: this.docTokensTableName,
        request: {
          PutRequest: {
            Item: {
              [INDEX_TABLE_KIND_ATTRIBUTE]:
                INDEX_ITEM_KINDS.fullTextDocumentToken,
              [docTokensSchema.partitionKey]: docKey,
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
            },
          },
        },
      },
      {
        tableName: this.docTokenPositionsTableName,
        request: {
          PutRequest: {
            Item: {
              [INDEX_TABLE_KIND_ATTRIBUTE]:
                INDEX_ITEM_KINDS.fullTextTokenPositions,
              [docTokenPositionsSchema.partitionKey]: positionsDocKey,
              [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
              [docTokenPositionsSchema.positionsAttribute]: [...positions],
            },
          },
        },
      },
    ];

    await this.mutationCoordinator.write(writes);
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
    const docKey = encodeDocKey(docId);
    const positionsDocKey = encodeDocKey(docId, "positions");
    const writes: TableWrite[] = [
      {
        tableName: this.exactTableName,
        request: {
          DeleteRequest: {
            Key: {
              [exactPostingsSchema.partitionKey]: encodeTokenKey(
                indexField,
                token,
                "exact",
              ),
              [exactPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
            },
          },
        },
      },
      {
        tableName: this.docTokensTableName,
        request: {
          DeleteRequest: {
            Key: {
              [docTokensSchema.partitionKey]: docKey,
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
            },
          },
        },
      },
      {
        tableName: this.docTokenPositionsTableName,
        request: {
          DeleteRequest: {
            Key: {
              [docTokenPositionsSchema.partitionKey]: positionsDocKey,
              [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(
                indexField,
                token,
              ),
            },
          },
        },
      },
    ];

    await this.mutationCoordinator.write(writes);
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
    this.recordItemRead();
    const response = await this.client.getItem({
      TableName: this.docTokenPositionsTableName,
      Key: {
        [docTokenPositionsSchema.partitionKey]: encodeDocKey(
          docId,
          "positions",
        ),
        [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(
          indexField,
          token,
        ),
      },
    });

    const raw = response.Item?.[docTokenPositionsSchema.positionsAttribute];
    if (!Array.isArray(raw)) {
      return undefined;
    }

    const positions = raw.filter(
      (value): value is number => typeof value === "number",
    );
    return positions.length ? positions : undefined;
  }

  /**
   * Batch load exact positions for token keys.
   * @param keys Token keys to load positions for.
   * @returns Positions arrays aligned with the input keys.
   */
  async batchLoadExactPositions(
    keys: DocTokenKey[],
  ): Promise<(number[] | undefined)[]> {
    const results: (number[] | undefined)[] = [];
    const keyChunks = chunkArray(keys, 100);

    for (const chunk of keyChunks) {
      const requestKeys = chunk.map((key) => ({
        [docTokenPositionsSchema.partitionKey]: encodeDocKey(
          key.docId,
          "positions",
        ),
        [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(
          key.indexField,
          key.token,
        ),
      }));

      const foundPositions = new Map<string, number[] | undefined>();
      let unprocessed: Record<string, KeysAndAttributes> | undefined = {
        [this.docTokenPositionsTableName]: {
          Keys: requestKeys,
          ProjectionExpression: [
            docTokenPositionsSchema.partitionKey,
            docTokenPositionsSchema.sortKey,
            docTokenPositionsSchema.positionsAttribute,
          ].join(", "),
        },
      };

      while (unprocessed && Object.keys(unprocessed).length > 0) {
        this.recordBatchGet();
        const response = await this.client.batchGetItem({
          RequestItems: unprocessed,
        });
        const tableResponses =
          response.Responses?.[this.docTokenPositionsTableName] ?? [];

        for (const item of tableResponses) {
          const partitionKey = item[docTokenPositionsSchema.partitionKey];
          const sortKey = item[docTokenPositionsSchema.sortKey];
          if (typeof partitionKey !== "string" || typeof sortKey !== "string") {
            continue;
          }

          const rawPositions = item[docTokenPositionsSchema.positionsAttribute];
          const positions = Array.isArray(rawPositions)
            ? rawPositions.filter(
                (value): value is number => typeof value === "number",
              )
            : undefined;
          const key = buildDocTokenItemKey(partitionKey, sortKey);
          foundPositions.set(
            key,
            positions && positions.length ? positions : undefined,
          );
        }

        unprocessed = response.UnprocessedKeys;
      }

      chunk.forEach(({ docId, indexField, token }) => {
        const key = buildDocTokenItemKey(
          encodeDocKey(docId, "positions"),
          encodeDocTokenSortKey(indexField, token),
        );
        results.push(foundPositions.get(key));
      });
    }

    return results;
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
    this.recordItemRead();
    const response = await this.client.getItem({
      TableName: this.docTokensTableName,
      Key: {
        [docTokensSchema.partitionKey]: encodeDocKey(docId),
        [docTokensSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
      },
    });

    return response.Item !== undefined;
  }

  /**
   * Batch check whether documents contain tokens.
   * @param keys Token keys to check.
   * @returns Booleans aligned with the input keys.
   */
  async batchHasDocTokens(keys: DocTokenKey[]): Promise<boolean[]> {
    const results: boolean[] = [];
    const keyChunks = chunkArray(keys, 100);

    for (const chunk of keyChunks) {
      const requestKeys = chunk.map((key) => ({
        [docTokensSchema.partitionKey]: encodeDocKey(key.docId),
        [docTokensSchema.sortKey]: encodeDocTokenSortKey(
          key.indexField,
          key.token,
        ),
      }));

      const foundKeys = new Set<string>();
      let unprocessed: Record<string, KeysAndAttributes> | undefined = {
        [this.docTokensTableName]: { Keys: requestKeys },
      };

      while (unprocessed && Object.keys(unprocessed).length > 0) {
        this.recordBatchGet();
        const response = await this.client.batchGetItem({
          RequestItems: unprocessed,
        });
        const tableResponses =
          response.Responses?.[this.docTokensTableName] ?? [];

        for (const item of tableResponses) {
          const partitionKey = item[docTokensSchema.partitionKey];
          const sortKey = item[docTokensSchema.sortKey];
          if (typeof partitionKey === "string" && typeof sortKey === "string") {
            foundKeys.add(buildDocTokenItemKey(partitionKey, sortKey));
          }
        }

        unprocessed = response.UnprocessedKeys;
      }

      chunk.forEach(({ docId, indexField, token }) => {
        const key = buildDocTokenItemKey(
          encodeDocKey(docId),
          encodeDocTokenSortKey(indexField, token),
        );
        results.push(foundKeys.has(key));
      });
    }

    return results;
  }

  /**
   * Load token stats for a token.
   * @param token Token value to load stats for.
   * @param indexField Field name the token was indexed under.
   * @returns Token stats or undefined when missing.
   */
  async loadTokenStats(
    token: string,
    indexField: string,
  ): Promise<TokenStats | undefined> {
    this.recordItemRead();
    const response = await this.client.getItem({
      TableName: this.tokenStatsTableName,
      Key: {
        [fullTextTokenStatsSchema.partitionKey]: encodeTokenKey(
          indexField,
          token,
          "stats",
        ),
        [fullTextTokenStatsSchema.sortKey]: FULL_TEXT_TOKEN_STATS_SORT_KEY,
      },
    });

    const rawDf =
      response.Item?.[fullTextTokenStatsSchema.documentFrequencyAttribute];
    if (typeof rawDf !== "number") {
      return undefined;
    }

    return { df: rawDf, version: 1 };
  }
}

export type FullTextLossyPostingsPage = LossyPostingsPage;
export type FullTextLossyPostingsPageOptions = LossyPostingsPageOptions;
