/**
 * @packageDocumentation
 *
 * DynamoDB-backed fulltext indexing. Uses namespaced lossy/exact postings,
 * document mirrors, and token statistics in one table to support fast search with
 * cursor-based paging.
 */
import { tokenize, tokenizeLossyTrigrams } from "../tokenize";
import type { DocId, DocTokenKey, DocumentRecord, TokenStats } from "../Types";
import type { SearchTrace } from "../Trace";
import { normalizeDocId } from "../docId";
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
} from "./Schema";
import {
  INDEX_ITEM_KINDS,
  INDEX_TABLE_KIND_ATTRIBUTE,
  assertIndexTableConfig,
  decodeIndexDocumentSortKey,
  type IndexTableConfig,
} from "../IndexTable";
import { IndexMutationCoordinator } from "../ddb/IndexMutationCoordinator";
import type {
  DynamoBatchWriter,
  DynamoQueryClient,
  KeysAndAttributes,
  WriteRequest,
} from "../ddb/Types";
export * from "../ddb/Types";

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

function buildPositionMap(tokens: string[]): Map<string, number[]> {
  const positions = new Map<string, number[]>();
  tokens.forEach((token, index) => {
    const list = positions.get(token) ?? [];
    list.push(index);
    positions.set(token, list);
  });
  return positions;
}

function resolveIndexText(
  document: DocumentRecord,
  indexField: string,
): string {
  const value = document[indexField];
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function arraysEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

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

  private async loadMirrorContent(
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

  /**
   * Write a document to namespaced postings, membership, and statistics records.
   * @param document Document record to index.
   * @param primaryField Field name used as the document id.
   * @param indexField Field name containing the text to index.
   * @returns Promise resolved once all writes complete.
   */
  async writeDocument(
    document: DocumentRecord,
    primaryField: string,
    indexField: string,
    indexFieldQualified = indexField,
    previousDocument?: DocumentRecord,
  ): Promise<void> {
    const sourceIndexField = indexField;
    const docId = normalizeDocId(document[primaryField], primaryField);
    const text = resolveIndexText(document, indexField);
    const persistedIndexField = indexFieldQualified;
    const { tokens: lossyTokens } = tokenizeLossyTrigrams(text);
    const { normalized, tokens } = tokenize(text);
    const previousContent =
      (await this.loadMirrorContent(docId, persistedIndexField)) ??
      (previousDocument
        ? resolveIndexText(previousDocument, sourceIndexField)
        : undefined);
    indexField = persistedIndexField;
    const previousTokens = previousContent
      ? tokenize(previousContent).tokens
      : [];
    const previousLossyTokens = previousContent
      ? tokenizeLossyTrigrams(previousContent).tokens
      : [];

    const previousLossySet = new Set(previousLossyTokens);
    const nextLossySet = new Set(lossyTokens);

    const previousPositions = buildPositionMap(previousTokens);
    const nextPositions = buildPositionMap(tokens);

    const removedLossyTokens = new Set<string>();
    const addedLossyTokens = new Set<string>();
    const removedTokens = new Set<string>();
    const addedTokens = new Set<string>();
    const updatedTokens = new Set<string>();

    for (const token of previousLossySet) {
      if (!nextLossySet.has(token)) {
        removedLossyTokens.add(token);
      }
    }

    for (const token of nextLossySet) {
      if (!previousLossySet.has(token)) {
        addedLossyTokens.add(token);
      }
    }

    for (const token of previousPositions.keys()) {
      if (!nextPositions.has(token)) {
        removedTokens.add(token);
      }
    }

    for (const [token, positions] of nextPositions.entries()) {
      const previous = previousPositions.get(token);
      if (!previous) {
        addedTokens.add(token);
      } else if (!arraysEqual(previous, positions)) {
        updatedTokens.add(token);
      }
    }

    const writes: TableWrite[] = [];
    const docKey = encodeDocKey(docId);
    const positionsDocKey = encodeDocKey(docId, "positions");

    const statWrites = await Promise.all([
      ...[...removedLossyTokens].map((token) =>
        this.buildTokenStatsWrite(token, indexField, -1),
      ),
      ...[...addedLossyTokens].map((token) =>
        this.buildTokenStatsWrite(token, indexField, 1),
      ),
    ]);

    for (const token of removedLossyTokens) {
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

    for (const token of addedLossyTokens) {
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

    for (const token of removedTokens) {
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

    for (const token of [...addedTokens, ...updatedTokens]) {
      const positions = nextPositions.get(token);
      if (!positions) {
        continue;
      }
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
      request: normalized
        ? {
            PutRequest: {
              Item: {
                ...mirrorKey,
                [INDEX_TABLE_KIND_ATTRIBUTE]:
                  INDEX_ITEM_KINDS.fullTextDocumentMirror,
                [fullTextDocMirrorSchema.contentAttribute]: normalized,
              },
            },
          }
        : { DeleteRequest: { Key: mirrorKey } },
    });

    await this.mutationCoordinator.write(writes);
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
   * Attach or clear an active search trace for metrics.
   * @param trace Trace instance to record metrics into.
   * @returns Nothing.
   */
  setActiveTrace(trace: SearchTrace | undefined): void {
    this.activeTrace = trace;
  }

  private recordQuery(): void {
    if (this.activeTrace) {
      this.activeTrace.ddbQueryCalls += 1;
    }
  }

  private recordBatchGet(): void {
    if (this.activeTrace) {
      this.activeTrace.ddbBatchGetCalls += 1;
    }
  }

  private recordItemRead(): void {
    if (this.activeTrace) {
      this.activeTrace.ddbItemReadCalls += 1;
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
