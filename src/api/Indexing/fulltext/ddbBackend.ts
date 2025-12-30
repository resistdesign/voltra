/**
 * @packageDocumentation
 *
 * DynamoDB-backed fulltext indexing. Uses lossy and exact postings tables,
 * optional document mirrors, and token stats to support fast search with
 * cursor-based paging.
 */
import {tokenize, tokenizeLossyTrigrams} from "../tokenize.js";
import type {DocId, DocTokenKey, DocumentRecord, TokenStats} from '../types.js';
import type {SearchTrace} from '../trace.js';
import {normalizeDocId} from '../docId.js';
import {
  docTokenPositionsSchema,
  docTokensSchema,
  encodeDocKey,
  encodeDocMirrorKey,
  encodeDocTokenSortKey,
  encodeTokenDocSortKey,
  encodeTokenKey,
  exactPostingsSchema,
  fullTextDocMirrorSchema,
  fullTextKeyPrefixes,
  fullTextTokenStatsSchema,
  lossyPostingsSchema,
} from './schema.js';

type AttributeMap = Record<string, unknown>;

export type BatchWriteItemInput = {
  RequestItems: Record<string, WriteRequest[]>;
};

export type BatchWriteItemOutput = {
  UnprocessedItems?: Record<string, WriteRequest[]>;
};

export type KeysAndAttributes = {
  Keys: AttributeMap[];
  ProjectionExpression?: string;
};

export type BatchGetItemInput = {
  RequestItems: Record<string, KeysAndAttributes>;
};

export type BatchGetItemOutput = {
  Responses?: Record<string, AttributeMap[]>;
  UnprocessedKeys?: Record<string, KeysAndAttributes>;
};

export type GetItemInput = {
  TableName: string;
  Key: AttributeMap;
};

export type GetItemOutput = {
  Item?: AttributeMap;
};

export type WriteRequest = {
  PutRequest?: { Item: AttributeMap };
  DeleteRequest?: { Key: AttributeMap };
};

export type DynamoBatchWriter = {
  batchWriteItem(input: BatchWriteItemInput): Promise<BatchWriteItemOutput>;
  batchGetItem(input: BatchGetItemInput): Promise<BatchGetItemOutput>;
  getItem(input: GetItemInput): Promise<GetItemOutput>;
};

export type QueryInput = {
  TableName: string;
  KeyConditionExpression: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues: AttributeMap;
  ExclusiveStartKey?: AttributeMap;
  Limit?: number;
};

export type QueryOutput = {
  Items?: AttributeMap[];
  LastEvaluatedKey?: AttributeMap;
};

export type DynamoQueryClient = DynamoBatchWriter & {
  query(input: QueryInput): Promise<QueryOutput>;
};

export type FullTextDdbWriterConfig = {
  client: DynamoBatchWriter;
  lossyTableName?: string;
  exactTableName?: string;
  mirrorTableName?: string;
  docTokensTableName?: string;
  docTokenPositionsTableName?: string;
  tokenStatsTableName?: string;
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

function resolveIndexText(document: DocumentRecord, indexField: string): string {
  const value = document[indexField];
  if (value === null || value === undefined) {
    return '';
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

function chunkRequests(requests: TableWrite[], size: number): TableWrite[][] {
  const chunks: TableWrite[][] = [];
  for (let index = 0; index < requests.length; index += size) {
    chunks.push(requests.slice(index, index + size));
  }
  return chunks;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildRequestItems(chunk: TableWrite[]): Record<string, WriteRequest[]> {
  return chunk.reduce<Record<string, WriteRequest[]>>((accumulator, {tableName, request}) => {
    const tableRequests = accumulator[tableName] ?? [];
    tableRequests.push(request);
    accumulator[tableName] = tableRequests;
    return accumulator;
  }, {});
}

async function batchWriteWithRetry(
  client: DynamoBatchWriter,
  requestItems: Record<string, WriteRequest[]>,
): Promise<void> {
  let unprocessed: Record<string, WriteRequest[]> | undefined = requestItems;

  while (unprocessed && Object.keys(unprocessed).length > 0) {
    const response = await client.batchWriteItem({RequestItems: unprocessed});
    unprocessed = response.UnprocessedItems;
  }
}

function decodeDocKey(value: unknown): DocId | undefined {
  if (typeof value !== 'string' || !value.startsWith(fullTextKeyPrefixes.doc)) {
    return undefined;
  }

  return value.slice(fullTextKeyPrefixes.doc.length);
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

  constructor(config: FullTextDdbWriterConfig) {
    this.client = config.client;
    this.lossyTableName = config.lossyTableName ?? lossyPostingsSchema.tableName;
    this.exactTableName = config.exactTableName ?? exactPostingsSchema.tableName;
    this.mirrorTableName = config.mirrorTableName ?? fullTextDocMirrorSchema.tableName;
    this.docTokensTableName = config.docTokensTableName ?? docTokensSchema.tableName;
    this.docTokenPositionsTableName =
      config.docTokenPositionsTableName ?? docTokenPositionsSchema.tableName;
    this.tokenStatsTableName = config.tokenStatsTableName ?? fullTextTokenStatsSchema.tableName;
  }

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
        [fullTextTokenStatsSchema.partitionKey]: encodeTokenKey(indexField, token),
      },
    });

    const rawDf = response.Item?.[fullTextTokenStatsSchema.documentFrequencyAttribute];
    const currentDf = typeof rawDf === 'number' ? rawDf : 0;
    const nextDf = currentDf + delta;

    if (nextDf <= 0) {
      return {
        tableName: this.tokenStatsTableName,
        request: {
          DeleteRequest: {
            Key: {
              [fullTextTokenStatsSchema.partitionKey]: encodeTokenKey(indexField, token),
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
            [fullTextTokenStatsSchema.partitionKey]: encodeTokenKey(indexField, token),
            [fullTextTokenStatsSchema.documentFrequencyAttribute]: nextDf,
          },
        },
      },
    };
  }

  private async loadMirrorContent(docId: DocId, indexField: string): Promise<string | undefined> {
    const response = await this.client.getItem({
      TableName: this.mirrorTableName,
      Key: {
        [fullTextDocMirrorSchema.partitionKey]: encodeDocMirrorKey(indexField, docId),
      },
    });

    const raw = response.Item?.[fullTextDocMirrorSchema.contentAttribute];
    return typeof raw === 'string' ? raw : undefined;
  }

  async writeDocument(
    document: DocumentRecord,
    primaryField: string,
    indexField: string,
  ): Promise<void> {
    const docId = normalizeDocId(document[primaryField], primaryField);
    const text = resolveIndexText(document, indexField);
    const {tokens: lossyTokens} = tokenizeLossyTrigrams(text);
    const {normalized, tokens} = tokenize(text);
    const previousContent = await this.loadMirrorContent(docId, indexField);
    const previousTokens = previousContent ? tokenize(previousContent).tokens : [];
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

    const statWrites = await Promise.all([
      ...[...removedLossyTokens].map((token) => this.buildTokenStatsWrite(token, indexField, -1)),
      ...[...addedLossyTokens].map((token) => this.buildTokenStatsWrite(token, indexField, 1)),
    ]);

    for (const token of removedLossyTokens) {
      writes.push({
        tableName: this.lossyTableName,
        request: {
          DeleteRequest: {
            Key: {
              [lossyPostingsSchema.partitionKey]: encodeTokenKey(indexField, token),
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
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
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
              [lossyPostingsSchema.partitionKey]: encodeTokenKey(indexField, token),
              [lossyPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
            },
          },
        },
      });
      writes.push({
        tableName: this.docTokensTableName,
        request: {
          PutRequest: {
            Item: {
              [docTokensSchema.partitionKey]: docKey,
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
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
              [exactPostingsSchema.partitionKey]: encodeTokenKey(indexField, token),
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
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
            },
          },
        },
      });
      writes.push({
        tableName: this.docTokenPositionsTableName,
        request: {
          DeleteRequest: {
            Key: {
              [docTokenPositionsSchema.partitionKey]: docKey,
              [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
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
              [exactPostingsSchema.partitionKey]: encodeTokenKey(indexField, token),
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
              [docTokenPositionsSchema.partitionKey]: docKey,
              [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
              [docTokenPositionsSchema.positionsAttribute]: [...positions],
            },
          },
        },
      });
    }

    writes.push({
      tableName: this.mirrorTableName,
      request: {
        PutRequest: {
          Item: {
            [fullTextDocMirrorSchema.partitionKey]: encodeDocMirrorKey(indexField, docId),
            [fullTextDocMirrorSchema.contentAttribute]: normalized,
          },
        },
      },
    });

    const chunks = chunkRequests(writes, 25);
    for (const chunk of chunks) {
      await batchWriteWithRetry(this.client, buildRequestItems(chunk));
    }
  }
}

export type FullTextDdbBackendConfig = FullTextDdbWriterConfig & {
  client: DynamoQueryClient;
};

export type LossyPostingsPage = {
  docIds: DocId[];
  lastEvaluatedDocId?: DocId;
};

export type LossyPostingsPageOptions = {
  exclusiveStartDocId?: DocId;
  limit?: number;
};

/**
 * Read/write DynamoDB backend that adds query helpers to {@link FullTextDdbWriter}.
 */
export class FullTextDdbBackend extends FullTextDdbWriter {
  private readonly queryClient: DynamoQueryClient;
  private activeTrace: SearchTrace | undefined;

  constructor(config: FullTextDdbBackendConfig) {
    super(config);
    this.queryClient = config.client;
  }

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

  async addLossyPosting(token: string, indexField: string, docId: DocId): Promise<void> {
    const docKey = encodeDocKey(docId);
    const writes: TableWrite[] = [
      {
        tableName: this.lossyTableName,
        request: {
          PutRequest: {
            Item: {
              [lossyPostingsSchema.partitionKey]: encodeTokenKey(indexField, token),
              [lossyPostingsSchema.sortKey]: encodeTokenDocSortKey(docId),
            },
          },
        },
      },
      {
        tableName: this.docTokensTableName,
        request: {
          PutRequest: {
            Item: {
              [docTokensSchema.partitionKey]: docKey,
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
            },
          },
        },
      },
    ];

    const statWrite = await this.buildTokenStatsWrite(token, indexField, 1);
    if (statWrite) {
      writes.push(statWrite);
    }

    await batchWriteWithRetry(this.client, buildRequestItems(writes));
  }

  async removeLossyPosting(token: string, indexField: string, docId: DocId): Promise<void> {
    const docKey = encodeDocKey(docId);
    const writes: TableWrite[] = [
      {
        tableName: this.lossyTableName,
        request: {
          DeleteRequest: {
            Key: {
              [lossyPostingsSchema.partitionKey]: encodeTokenKey(indexField, token),
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
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
            },
          },
        },
      },
    ];

    const statWrite = await this.buildTokenStatsWrite(token, indexField, -1);
    if (statWrite) {
      writes.push(statWrite);
    }

    await batchWriteWithRetry(this.client, buildRequestItems(writes));
  }

  async loadLossyPostings(token: string, indexField: string): Promise<DocId[]> {
    const docIds: DocId[] = [];
    let exclusiveStartDocId: DocId | undefined;

    while (true) {
      const page = await this.queryLossyPostingsPage(token, indexField, {exclusiveStartDocId});
      docIds.push(...page.docIds);

      if (page.lastEvaluatedDocId === undefined) {
        break;
      }

      exclusiveStartDocId = page.lastEvaluatedDocId;
    }

    return docIds;
  }

  async queryLossyPostingsPage(
    token: string,
    indexField: string,
    options: LossyPostingsPageOptions = {},
  ): Promise<LossyPostingsPage> {
    this.recordQuery();
    const response = await this.queryClient.query({
      TableName: this.lossyTableName,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': lossyPostingsSchema.partitionKey,
      },
      ExpressionAttributeValues: {
        ':pk': encodeTokenKey(indexField, token),
      },
      ExclusiveStartKey: options.exclusiveStartDocId
        ? {
          [lossyPostingsSchema.partitionKey]: encodeTokenKey(indexField, token),
          [lossyPostingsSchema.sortKey]: encodeDocKey(options.exclusiveStartDocId),
        }
        : undefined,
      Limit: options.limit,
    });

    const docIds =
      response.Items?.map((item) => decodeDocKey(item[lossyPostingsSchema.sortKey])).filter(
        (docId): docId is DocId => docId !== undefined,
      ) ?? [];

    const lastEvaluatedDocId = decodeDocKey(
      response.LastEvaluatedKey?.[lossyPostingsSchema.sortKey],
    );

    return {docIds, lastEvaluatedDocId};
  }

  async addExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
    positions: number[],
  ): Promise<void> {
    const docKey = encodeDocKey(docId);
    const writes: TableWrite[] = [
      {
        tableName: this.exactTableName,
        request: {
          PutRequest: {
            Item: {
              [exactPostingsSchema.partitionKey]: encodeTokenKey(indexField, token),
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
              [docTokensSchema.partitionKey]: docKey,
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
            },
          },
        },
      },
      {
        tableName: this.docTokenPositionsTableName,
        request: {
          PutRequest: {
            Item: {
              [docTokenPositionsSchema.partitionKey]: docKey,
              [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
              [docTokenPositionsSchema.positionsAttribute]: [...positions],
            },
          },
        },
      },
    ];

    await batchWriteWithRetry(this.client, buildRequestItems(writes));
  }

  async removeExactPositions(token: string, indexField: string, docId: DocId): Promise<void> {
    const docKey = encodeDocKey(docId);
    const writes: TableWrite[] = [
      {
        tableName: this.exactTableName,
        request: {
          DeleteRequest: {
            Key: {
              [exactPostingsSchema.partitionKey]: encodeTokenKey(indexField, token),
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
              [docTokensSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
            },
          },
        },
      },
      {
        tableName: this.docTokenPositionsTableName,
        request: {
          DeleteRequest: {
            Key: {
              [docTokenPositionsSchema.partitionKey]: docKey,
              [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
            },
          },
        },
      },
    ];

    await batchWriteWithRetry(this.client, buildRequestItems(writes));
  }

  async loadExactPositions(
    token: string,
    indexField: string,
    docId: DocId,
  ): Promise<number[] | undefined> {
    this.recordItemRead();
    const response = await this.client.getItem({
      TableName: this.docTokenPositionsTableName,
      Key: {
        [docTokenPositionsSchema.partitionKey]: encodeDocKey(docId),
        [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(indexField, token),
      },
    });

    const raw = response.Item?.[docTokenPositionsSchema.positionsAttribute];
    if (!Array.isArray(raw)) {
      return undefined;
    }

    const positions = raw.filter((value): value is number => typeof value === 'number');
    return positions.length ? positions : undefined;
  }

  async batchLoadExactPositions(keys: DocTokenKey[]): Promise<(number[] | undefined)[]> {
    const results: (number[] | undefined)[] = [];
    const keyChunks = chunkArray(keys, 100);

    for (const chunk of keyChunks) {
      const requestKeys = chunk.map((key) => ({
        [docTokenPositionsSchema.partitionKey]: encodeDocKey(key.docId),
        [docTokenPositionsSchema.sortKey]: encodeDocTokenSortKey(key.indexField, key.token),
      }));

      const foundPositions = new Map<string, number[] | undefined>();
      let unprocessed: Record<string, KeysAndAttributes> | undefined = {
        [this.docTokenPositionsTableName]: {
          Keys: requestKeys,
          ProjectionExpression: docTokenPositionsSchema.positionsAttribute,
        },
      };

      while (unprocessed && Object.keys(unprocessed).length > 0) {
        this.recordBatchGet();
        const response = await this.client.batchGetItem({RequestItems: unprocessed});
        const tableResponses = response.Responses?.[this.docTokenPositionsTableName] ?? [];

        for (const item of tableResponses) {
          const partitionKey = item[docTokenPositionsSchema.partitionKey];
          const sortKey = item[docTokenPositionsSchema.sortKey];
          if (typeof partitionKey !== 'string' || typeof sortKey !== 'string') {
            continue;
          }

          const rawPositions = item[docTokenPositionsSchema.positionsAttribute];
          const positions = Array.isArray(rawPositions)
            ? rawPositions.filter((value): value is number => typeof value === 'number')
            : undefined;
          const key = buildDocTokenItemKey(partitionKey, sortKey);
          foundPositions.set(key, positions && positions.length ? positions : undefined);
        }

        unprocessed = response.UnprocessedKeys;
      }

      chunk.forEach(({docId, indexField, token}) => {
        const key = buildDocTokenItemKey(
          encodeDocKey(docId),
          encodeDocTokenSortKey(indexField, token),
        );
        results.push(foundPositions.get(key));
      });
    }

    return results;
  }

  async hasDocToken(docId: DocId, indexField: string, token: string): Promise<boolean> {
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

  async batchHasDocTokens(keys: DocTokenKey[]): Promise<boolean[]> {
    const results: boolean[] = [];
    const keyChunks = chunkArray(keys, 100);

    for (const chunk of keyChunks) {
      const requestKeys = chunk.map((key) => ({
        [docTokensSchema.partitionKey]: encodeDocKey(key.docId),
        [docTokensSchema.sortKey]: encodeDocTokenSortKey(key.indexField, key.token),
      }));

      const foundKeys = new Set<string>();
      let unprocessed: Record<string, KeysAndAttributes> | undefined = {
        [this.docTokensTableName]: {Keys: requestKeys},
      };

      while (unprocessed && Object.keys(unprocessed).length > 0) {
        this.recordBatchGet();
        const response = await this.client.batchGetItem({RequestItems: unprocessed});
        const tableResponses = response.Responses?.[this.docTokensTableName] ?? [];

        for (const item of tableResponses) {
          const partitionKey = item[docTokensSchema.partitionKey];
          const sortKey = item[docTokensSchema.sortKey];
          if (typeof partitionKey === 'string' && typeof sortKey === 'string') {
            foundKeys.add(buildDocTokenItemKey(partitionKey, sortKey));
          }
        }

        unprocessed = response.UnprocessedKeys;
      }

      chunk.forEach(({docId, indexField, token}) => {
        const key = buildDocTokenItemKey(
          encodeDocKey(docId),
          encodeDocTokenSortKey(indexField, token),
        );
        results.push(foundKeys.has(key));
      });
    }

    return results;
  }

  async loadTokenStats(token: string, indexField: string): Promise<TokenStats | undefined> {
    this.recordItemRead();
    const response = await this.client.getItem({
      TableName: this.tokenStatsTableName,
      Key: {
        [fullTextTokenStatsSchema.partitionKey]: encodeTokenKey(indexField, token),
      },
    });

    const rawDf = response.Item?.[fullTextTokenStatsSchema.documentFrequencyAttribute];
    if (typeof rawDf !== 'number') {
      return undefined;
    }

    return {df: rawDf, version: 1};
  }
}
