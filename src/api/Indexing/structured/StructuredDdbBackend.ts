/**
 * @packageDocumentation
 *
 * DynamoDB-backed structured indexing reader/writer implementations.
 */
import type { DynamoQueryClient, WriteRequest } from "../ddb/Types";
import type { DocId } from "../Types";
import {
  assertIndexSortKey,
  assertIndexTableConfig,
  type IndexTableConfig,
} from "../IndexTable";
import type { StructuredSearchDependencies } from "./SearchStructured";
import type { StructuredQueryOptions, WhereValue } from "./Types";
import { batchWriteWithRetry } from "../ddb/AwsSdkV3Adapter";
import type { StructuredStringTokenizerConfig } from "./StructuredStringLike";
import {
  buildStructuredTermKey,
  buildStructuredDocFieldsKey,
  buildStructuredRangePartitionKey,
  buildStructuredDocFieldsItem,
  serializeStructuredValue,
  structuredDocFieldsSchema,
  structuredRangeIndexSchema,
  structuredTermIndexSchema,
  type StructuredDocFieldsState,
  type StructuredDocFieldsItem,
  type StructuredDocFieldsRecord,
  type StructuredRangeIndexItem,
  type StructuredRangeIndexKey,
  type StructuredTermIndexItem,
  type StructuredTermIndexKey,
} from "./StructuredDdb";
import {
  StructuredDdbWriter,
  type StructuredWriterOptions,
  type StructuredWriterDependencies,
} from "./StructuredWriter";
import {
  buildStructuredGenerationStateItem,
  buildStructuredGenerationStateKey,
  buildStructuredMissingPartitionKey,
  buildStructuredMissingItems,
  buildStructuredOccupancyItems,
  buildStructuredOccupancyPartitionKey,
  type StructuredOccupancyBackfillDocument,
  type StructuredOccupancyGenerationState,
  type StructuredOccupancyItem,
} from "./StructuredOccupancy";
import type { StructuredDerivedMutation } from "./StructuredWriter";

type DynamoKey = Record<string, unknown>;

/**
 * @deprecated Use {@link IndexTableConfig}. All structured records share one table.
 */
export type StructuredTableNames = IndexTableConfig;

/**
 * Configuration for structured DynamoDB backends.
 *
 * One table name is required and should be injected per deployment.
 */
export type StructuredDdbConfig = {
  client: DynamoQueryClient;
  table: IndexTableConfig;
  writerOptions?: StructuredWriterOptions;
  tokenizer?: Partial<StructuredStringTokenizerConfig>;
};

const decodeCursorKey = (cursor?: string): DynamoKey | undefined => {
  if (!cursor) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(cursor) as DynamoKey;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid structured cursor token.");
    }
    return parsed;
  } catch (_error) {
    throw new Error("Invalid structured cursor token.");
  }
};

const encodeCursorKey = (key?: DynamoKey): string | undefined =>
  key ? JSON.stringify(key) : undefined;

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

const buildRangeLowerKey = (value: WhereValue): string =>
  assertIndexSortKey(`${serializeStructuredValue(value)}#`);

const buildRangeUpperKey = (value: WhereValue): string =>
  assertIndexSortKey(`${serializeStructuredValue(value)}#\uffff`);

/**
 * Read-only structured queries against DynamoDB term/range indexes.
 */
export class StructuredDdbReader implements StructuredSearchDependencies {
  private readonly client: DynamoQueryClient;
  private readonly termTableName: string;
  private readonly rangeTableName: string;
  private readonly docFieldsTableName: string;
  readonly tokenizer?: Partial<StructuredStringTokenizerConfig>;

  /**
   * @param config DynamoDB config for the unified index table.
   */
  constructor(config: StructuredDdbConfig) {
    assertIndexTableConfig(config.table);
    this.client = config.client;
    this.termTableName = config.table.tableName;
    this.rangeTableName = config.table.tableName;
    this.docFieldsTableName = config.table.tableName;
    this.tokenizer = config.tokenizer;
  }

  /**
   * Term query implementation for structured search.
   */
  terms = {
    /**
     * @param field Field name to query.
     * @param mode Term match mode.
     * @param value Value to match.
     * @param options Optional paging options.
     * @returns Candidate page with optional cursor token.
     */
    query: async (
      field: string,
      mode: "eq" | "contains",
      value: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> => {
      const termKey = buildStructuredTermKey(field, value, mode);
      const response = await this.client.query({
        TableName: this.termTableName,
        KeyConditionExpression: "#termKey = :termKey",
        ExpressionAttributeNames: {
          "#termKey": structuredTermIndexSchema.partitionKey,
        },
        ExpressionAttributeValues: {
          ":termKey": termKey,
        },
        ExclusiveStartKey: decodeCursorKey(options.cursor),
        Limit: options.limit,
      });

      const items = (response.Items ?? []) as StructuredTermIndexItem[];
      const candidateIds = items.map((item) => item.docId);

      return {
        candidateIds,
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
  };

  /**
   * Range query implementation for structured search.
   */
  ranges = {
    /**
     * @param field Field name to query.
     * @param lower Inclusive lower bound.
     * @param upper Inclusive upper bound.
     * @param options Optional paging options.
     * @returns Candidate page with optional cursor token.
     */
    between: async (
      field: string,
      lower: WhereValue,
      upper: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> => {
      const response = await this.client.query({
        TableName: this.rangeTableName,
        KeyConditionExpression:
          "#field = :field AND #rangeKey BETWEEN :lower AND :upper",
        ExpressionAttributeNames: {
          "#field": structuredRangeIndexSchema.partitionKey,
          "#rangeKey": structuredRangeIndexSchema.sortKey,
        },
        ExpressionAttributeValues: {
          ":field": buildStructuredRangePartitionKey(field),
          ":lower": buildRangeLowerKey(lower),
          ":upper": buildRangeUpperKey(upper),
        },
        ExclusiveStartKey: decodeCursorKey(options.cursor),
        Limit: options.limit,
      });

      const items = (response.Items ?? []) as StructuredRangeIndexItem[];
      const candidateIds = items.map((item) => item.docId);

      return {
        candidateIds,
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
    /**
     * @param field Field name to query.
     * @param lower Inclusive lower bound.
     * @param options Optional paging options.
     * @returns Candidate page with optional cursor token.
     */
    gte: async (
      field: string,
      lower: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> => {
      const response = await this.client.query({
        TableName: this.rangeTableName,
        KeyConditionExpression: "#field = :field AND #rangeKey >= :lower",
        ExpressionAttributeNames: {
          "#field": structuredRangeIndexSchema.partitionKey,
          "#rangeKey": structuredRangeIndexSchema.sortKey,
        },
        ExpressionAttributeValues: {
          ":field": buildStructuredRangePartitionKey(field),
          ":lower": buildRangeLowerKey(lower),
        },
        ExclusiveStartKey: decodeCursorKey(options.cursor),
        Limit: options.limit,
      });

      const items = (response.Items ?? []) as StructuredRangeIndexItem[];
      const candidateIds = items.map((item) => item.docId);

      return {
        candidateIds,
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
    /**
     * @param field Field name to query.
     * @param upper Inclusive upper bound.
     * @param options Optional paging options.
     * @returns Candidate page with optional cursor token.
     */
    lte: async (
      field: string,
      upper: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> => {
      const response = await this.client.query({
        TableName: this.rangeTableName,
        KeyConditionExpression: "#field = :field AND #rangeKey <= :upper",
        ExpressionAttributeNames: {
          "#field": structuredRangeIndexSchema.partitionKey,
          "#rangeKey": structuredRangeIndexSchema.sortKey,
        },
        ExpressionAttributeValues: {
          ":field": buildStructuredRangePartitionKey(field),
          ":upper": buildRangeUpperKey(upper),
        },
        ExclusiveStartKey: decodeCursorKey(options.cursor),
        Limit: options.limit,
      });

      const items = (response.Items ?? []) as StructuredRangeIndexItem[];
      const candidateIds = items.map((item) => item.docId);

      return {
        candidateIds,
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
    /** Traverse a scalar field in native range-key order. */
    all: async (
      field: string,
      options: StructuredQueryOptions = {},
    ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> => {
      const response = await this.client.query({
        TableName: this.rangeTableName,
        KeyConditionExpression: "#field = :field",
        ExpressionAttributeNames: {
          "#field": structuredRangeIndexSchema.partitionKey,
        },
        ExpressionAttributeValues: {
          ":field": buildStructuredRangePartitionKey(field),
        },
        ExclusiveStartKey: decodeCursorKey(options.cursor),
        Limit: options.limit,
        ScanIndexForward: !options.reverse,
      });
      const items = (response.Items ?? []) as StructuredRangeIndexItem[];
      return {
        candidateIds: items.map((item) => item.docId),
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
  };

  /** Sparse criterion-chunk/sort-token occupancy queries. */
  occupancy: NonNullable<StructuredSearchDependencies["occupancy"]> = {
    getActiveGeneration: async (): Promise<string | undefined> => {
      const response = await this.client.getItem({
        TableName: this.docFieldsTableName,
        Key: buildStructuredGenerationStateKey(),
      });
      return (response.Item as StructuredOccupancyGenerationState | undefined)
        ?.activeGeneration;
    },
    query: async (
      generation,
      criterionField,
      sortField,
      lowerChunk,
      upperChunk,
      options = {},
    ) => {
      const response = await this.client.query({
        TableName: this.rangeTableName,
        KeyConditionExpression: "#pk = :pk AND #sk BETWEEN :lower AND :upper",
        ExpressionAttributeNames: { "#pk": "pk", "#sk": "sk" },
        ExpressionAttributeValues: {
          ":pk": buildStructuredOccupancyPartitionKey(
            generation,
            criterionField,
            sortField,
          ),
          ":lower": assertIndexSortKey(lowerChunk),
          ":upper": assertIndexSortKey(upperChunk),
        },
        ExclusiveStartKey: decodeCursorKey(options.cursor),
        Limit: options.limit,
      });
      const items = (response.Items ?? []) as StructuredOccupancyItem[];
      return {
        cells: items.map(({ sortToken, sortValue }) => ({
          sortToken,
          sortValue,
        })),
        cursor: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
  };

  /** Documents whose eligible sort field is currently missing. */
  missing: NonNullable<StructuredSearchDependencies["missing"]> = {
    all: async (generation, sortField, options = {}) => {
      const response = await this.client.query({
        TableName: this.rangeTableName,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: {
          ":pk": buildStructuredMissingPartitionKey(generation, sortField),
        },
        ExclusiveStartKey: decodeCursorKey(options.cursor),
        Limit: options.limit,
      });
      const items = (response.Items ?? []) as Array<{ docId: DocId }>;
      return {
        candidateIds: items.map((item) => item.docId),
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
  };

  /** Canonical structured fields used for exact candidate verification. */
  documents = {
    get: async (
      docId: DocId,
    ): Promise<StructuredDocFieldsRecord | undefined> => {
      const response = await this.client.getItem({
        TableName: this.docFieldsTableName,
        Key: buildStructuredDocFieldsKey(docId),
      });
      return (response.Item as StructuredDocFieldsItem | undefined)?.fields;
    },
  };
}

class StructuredDdbWriterDependencies implements StructuredWriterDependencies {
  private readonly client: DynamoQueryClient;
  private readonly termTableName: string;
  private readonly rangeTableName: string;
  private readonly docFieldsTableName: string;

  constructor(config: StructuredDdbConfig) {
    assertIndexTableConfig(config.table);
    this.client = config.client;
    this.termTableName = config.table.tableName;
    this.rangeTableName = config.table.tableName;
    this.docFieldsTableName = config.table.tableName;
  }

  async loadDocFieldsState(
    docId: DocId,
  ): Promise<StructuredDocFieldsState | undefined> {
    const response = await this.client.getItem({
      TableName: this.docFieldsTableName,
      Key: buildStructuredDocFieldsKey(docId),
    });

    if (!response.Item) {
      return undefined;
    }

    const item = response.Item as {
      fields?: StructuredDocFieldsRecord;
      version?: number;
      occupancyFields?: StructuredDocFieldsState["occupancyFields"];
    };
    if (!item.fields) {
      return undefined;
    }

    return {
      fields: item.fields,
      version:
        typeof item.version === "number" && Number.isFinite(item.version)
          ? item.version
          : 0,
      occupancyFields: item.occupancyFields,
    };
  }

  async putDocFieldsIfVersion(
    docId: DocId,
    expectedVersion: number | undefined,
    fields: StructuredDocFieldsRecord,
    occupancyFields?: StructuredDocFieldsState["occupancyFields"],
  ): Promise<boolean> {
    if (typeof expectedVersion === "undefined") {
      const createResult = await this.client.putItem({
        TableName: this.docFieldsTableName,
        Item: buildStructuredDocFieldsItem(docId, fields, 1, occupancyFields),
        ConditionExpression: "attribute_not_exists(#pk)",
        ExpressionAttributeNames: {
          "#pk": structuredDocFieldsSchema.partitionKey,
        },
      });

      return !createResult.conditionFailed;
    }

    const nextVersion = expectedVersion + 1;
    const updateResult = await this.client.putItem({
      TableName: this.docFieldsTableName,
      Item: buildStructuredDocFieldsItem(
        docId,
        fields,
        nextVersion,
        occupancyFields,
      ),
      ConditionExpression:
        "(#version = :expectedVersion) OR (attribute_not_exists(#version) AND :expectedVersion = :zero)",
      ExpressionAttributeNames: {
        "#version": structuredDocFieldsSchema.versionAttribute,
      },
      ExpressionAttributeValues: {
        ":expectedVersion": expectedVersion,
        ":zero": 0,
      },
    });

    return !updateResult.conditionFailed;
  }

  async putTermEntries(entries: StructuredTermIndexItem[]): Promise<void> {
    await this.batchWrite(
      entries.map((entry) => ({
        tableName: this.termTableName,
        request: { PutRequest: { Item: entry } },
      })),
    );
  }

  async deleteTermEntries(entries: StructuredTermIndexKey[]): Promise<void> {
    await this.batchWrite(
      entries.map((entry) => ({
        tableName: this.termTableName,
        request: {
          DeleteRequest: {
            Key: {
              [structuredTermIndexSchema.partitionKey]: entry.pk,
              [structuredTermIndexSchema.sortKey]: entry.sk,
            },
          },
        },
      })),
    );
  }

  async putRangeEntries(entries: StructuredRangeIndexItem[]): Promise<void> {
    await this.batchWrite(
      entries.map((entry) => ({
        tableName: this.rangeTableName,
        request: { PutRequest: { Item: entry } },
      })),
    );
  }

  async deleteRangeEntries(entries: StructuredRangeIndexKey[]): Promise<void> {
    await this.batchWrite(
      entries.map((entry) => ({
        tableName: this.rangeTableName,
        request: {
          DeleteRequest: {
            Key: {
              [structuredRangeIndexSchema.partitionKey]: entry.pk,
              [structuredRangeIndexSchema.sortKey]: entry.sk,
            },
          },
        },
      })),
    );
  }

  async loadOccupancyGenerationState(): Promise<
    StructuredOccupancyGenerationState | undefined
  > {
    const response = await this.client.getItem({
      TableName: this.docFieldsTableName,
      Key: buildStructuredGenerationStateKey(),
    });
    return response.Item as StructuredOccupancyGenerationState | undefined;
  }

  async writeDerivedEntries(
    mutation: StructuredDerivedMutation,
  ): Promise<void> {
    const requests: Array<{
      tableName: string;
      request: WriteRequest;
    }> = [];
    const put = (items: Array<Record<string, unknown>>) => {
      for (const item of items) {
        requests.push({
          tableName: this.docFieldsTableName,
          request: { PutRequest: { Item: item } },
        });
      }
    };
    const remove = (items: Array<{ pk: string; sk: string }>) => {
      for (const item of items) {
        requests.push({
          tableName: this.docFieldsTableName,
          request: { DeleteRequest: { Key: { pk: item.pk, sk: item.sk } } },
        });
      }
    };

    remove(mutation.deleteTerms);
    remove(mutation.deleteRanges);
    remove(mutation.deleteMissing);
    put(mutation.putTerms);
    put(mutation.putRanges);
    put(mutation.putOccupancy);
    put(mutation.putMissing);
    await this.batchWrite(requests);
  }

  private async batchWrite(
    requests: Array<{ tableName: string; request: Record<string, unknown> }>,
  ): Promise<void> {
    const batches = chunk(requests, 25);

    for (const batch of batches) {
      const requestItems = batch.reduce<Record<string, WriteRequest[]>>(
        (acc, { tableName, request }) => {
          acc[tableName] = acc[tableName] ?? [];
          acc[tableName].push(request as WriteRequest);
          return acc;
        },
        {},
      );
      await batchWriteWithRetry(this.client, requestItems);
    }
  }
}

/** Explicit lifecycle operations for occupancy rebuilds and activation. */
export class StructuredDdbOccupancyMaintenance {
  private readonly tableName: string;

  constructor(private readonly config: StructuredDdbConfig) {
    assertIndexTableConfig(config.table);
    this.tableName = config.table.tableName;
  }

  /** Load the current generation pointer, synthesizing the initial state. */
  async getState(): Promise<StructuredOccupancyGenerationState> {
    const response = await this.config.client.getItem({
      TableName: this.tableName,
      Key: buildStructuredGenerationStateKey(),
    });
    return (
      (response.Item as StructuredOccupancyGenerationState | undefined) ?? {
        ...buildStructuredGenerationStateKey(),
        kind: "sg",
        version: 0,
      }
    );
  }

  private async compareAndSwap(
    expectedVersion: number | undefined,
    next: StructuredOccupancyGenerationState,
  ): Promise<void> {
    const result = await this.config.client.putItem({
      TableName: this.tableName,
      Item: next,
      ...(expectedVersion === undefined
        ? {
            ConditionExpression: "attribute_not_exists(#pk)",
            ExpressionAttributeNames: { "#pk": "pk" },
          }
        : {
            ConditionExpression: "#version = :expectedVersion",
            ExpressionAttributeNames: { "#version": "version" },
            ExpressionAttributeValues: { ":expectedVersion": expectedVersion },
          }),
    });
    if (result.conditionFailed) {
      throw new Error("Structured occupancy generation changed concurrently.");
    }
  }

  /** Open a separate building generation; ordinary writers then dual-write. */
  async beginRebuild(generation: string): Promise<void> {
    const state = await this.getState();
    if (state.buildingGeneration) {
      throw new Error("A structured occupancy rebuild is already active.");
    }
    if (generation === state.activeGeneration) {
      throw new Error(
        "A rebuild generation must differ from the active generation.",
      );
    }
    await this.compareAndSwap(
      state.version === 0 ? undefined : state.version,
      buildStructuredGenerationStateItem(
        state.activeGeneration,
        generation,
        state.version + 1,
      ),
    );
  }

  /** Idempotently add one canonical document to the building generation. */
  async backfillDocument(
    document: StructuredOccupancyBackfillDocument,
  ): Promise<void> {
    const state = await this.getState();
    if (!state.buildingGeneration) {
      throw new Error("No structured occupancy generation is building.");
    }
    const items = buildStructuredOccupancyItems(
      state.buildingGeneration,
      document.fields,
      document.occupancyFields,
    );
    const missing = buildStructuredMissingItems(
      state.buildingGeneration,
      document.docId,
      document.fields,
      document.occupancyFields,
    );
    const requests = [...items, ...missing].map((item) => ({
      PutRequest: { Item: item },
    }));
    for (const batch of chunk(requests, 25)) {
      await batchWriteWithRetry(this.config.client, {
        [this.tableName]: batch,
      });
    }
  }

  /** Backfill canonical snapshots idempotently into the building generation. */
  async backfill(
    documents:
      | Iterable<StructuredOccupancyBackfillDocument>
      | AsyncIterable<StructuredOccupancyBackfillDocument>,
  ): Promise<number> {
    let processedCount = 0;
    for await (const document of documents) {
      await this.backfillDocument(document);
      processedCount += 1;
    }
    return processedCount;
  }

  /** Activate the completed generation; old cursors immediately become stale. */
  async activateRebuild(): Promise<void> {
    const state = await this.getState();
    if (!state.buildingGeneration) {
      throw new Error("No structured occupancy generation is building.");
    }
    await this.compareAndSwap(
      state.version,
      buildStructuredGenerationStateItem(
        state.buildingGeneration,
        undefined,
        state.version + 1,
      ),
    );
  }

  /** Physically reclaim an inactive generation after its zero-retention switch. */
  async retireGeneration(
    generation: string,
    fields: string[],
  ): Promise<number> {
    const state = await this.getState();
    if (
      generation === state.activeGeneration ||
      generation === state.buildingGeneration
    ) {
      throw new Error(
        "Cannot retire an active structured occupancy generation.",
      );
    }
    const uniqueFields = Array.from(new Set(fields));
    const partitions = [
      ...uniqueFields.map((sortField) =>
        buildStructuredMissingPartitionKey(generation, sortField),
      ),
      ...uniqueFields.flatMap((criterionField) =>
        uniqueFields
          .filter((sortField) => sortField !== criterionField)
          .map((sortField) =>
            buildStructuredOccupancyPartitionKey(
              generation,
              criterionField,
              sortField,
            ),
          ),
      ),
    ];
    let deletedCount = 0;
    for (const partition of partitions) {
      let cursor: DynamoKey | undefined;
      do {
        const response = await this.config.client.query({
          TableName: this.tableName,
          KeyConditionExpression: "#pk = :pk",
          ExpressionAttributeNames: { "#pk": "pk" },
          ExpressionAttributeValues: { ":pk": partition },
          ExclusiveStartKey: cursor,
          Limit: 250,
        });
        const requests = (response.Items ?? []).map((item) => ({
          DeleteRequest: { Key: { pk: item.pk, sk: item.sk } },
        }));
        for (const batch of chunk(requests, 25)) {
          await batchWriteWithRetry(this.config.client, {
            [this.tableName]: batch,
          });
        }
        deletedCount += requests.length;
        cursor = response.LastEvaluatedKey;
      } while (cursor);
    }
    return deletedCount;
  }
}

/**
 * Convenience wrapper that exposes both the reader and writer.
 */
export class StructuredDdbBackend {
  /**
   * Reader implementation for structured queries.
   */
  readonly reader: StructuredSearchDependencies;
  /**
   * Writer implementation for structured indexing.
   */
  readonly writer: StructuredDdbWriter;
  /** Explicit occupancy rebuild/activation operations. */
  readonly occupancyMaintenance: StructuredDdbOccupancyMaintenance;

  /**
   * @param config DynamoDB config for the unified index table.
   */
  constructor(config: StructuredDdbConfig) {
    this.reader = new StructuredDdbReader(config);
    this.writer = new StructuredDdbWriter(
      new StructuredDdbWriterDependencies(config),
      {
        ...config.writerOptions,
        tokenizer: config.writerOptions?.tokenizer ?? config.tokenizer,
      },
    );
    this.occupancyMaintenance = new StructuredDdbOccupancyMaintenance(config);
  }
}
