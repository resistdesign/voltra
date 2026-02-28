/**
 * @packageDocumentation
 *
 * DynamoDB-backed structured indexing reader/writer implementations.
 */
import type { DynamoQueryClient, WriteRequest } from "../ddb/Types";
import type { DocId } from "../Types";
import type { StructuredSearchDependencies } from "./SearchStructured";
import type { StructuredQueryOptions, WhereValue } from "./Types";
import { batchWriteWithRetry } from "../ddb/AwsSdkV3Adapter";
import type { StructuredStringTokenizerConfig } from "./StructuredStringLike";
import {
  buildStructuredTermKey,
  buildStructuredDocFieldsItem,
  serializeStructuredValue,
  structuredDocFieldsSchema,
  structuredRangeIndexSchema,
  structuredTermIndexSchema,
  type StructuredDocFieldsState,
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

type DynamoKey = Record<string, unknown>;

/**
 * Deployment-specific DynamoDB table names required for structured indexing.
 */
export type StructuredTableNames = {
  termIndex: string;
  rangeIndex: string;
  docFields: string;
};

/**
 * Configuration for structured DynamoDB backends.
 *
 * Table names are required and should be injected per deployment.
 */
type StructuredDdbConfig = {
  client: DynamoQueryClient;
  tables: StructuredTableNames;
  writerOptions?: StructuredWriterOptions;
  tokenizer?: Partial<StructuredStringTokenizerConfig>;
};

const assertTableName = (label: string, value: string): void => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing table name for ${label}.`);
  }
};

const assertStructuredTables = (tables: StructuredTableNames): void => {
  assertTableName("structured.termIndex", tables.termIndex);
  assertTableName("structured.rangeIndex", tables.rangeIndex);
  assertTableName("structured.docFields", tables.docFields);
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
  `${serializeStructuredValue(value)}#`;

const buildRangeUpperKey = (value: WhereValue): string =>
  `${serializeStructuredValue(value)}#\uffff`;

/**
 * Read-only structured queries against DynamoDB term/range indexes.
 */
export class StructuredDdbReader implements StructuredSearchDependencies {
  private readonly client: DynamoQueryClient;
  private readonly termTableName: string;
  private readonly rangeTableName: string;

  /**
   * @param config DynamoDB config for structured tables.
   */
  constructor(config: StructuredDdbConfig) {
    assertStructuredTables(config.tables);
    this.client = config.client;
    this.termTableName = config.tables.termIndex;
    this.rangeTableName = config.tables.rangeIndex;
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
          ":field": field,
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
          ":field": field,
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
          ":field": field,
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
  };
}

class StructuredDdbWriterDependencies implements StructuredWriterDependencies {
  private readonly client: DynamoQueryClient;
  private readonly termTableName: string;
  private readonly rangeTableName: string;
  private readonly docFieldsTableName: string;

  constructor(config: StructuredDdbConfig) {
    assertStructuredTables(config.tables);
    this.client = config.client;
    this.termTableName = config.tables.termIndex;
    this.rangeTableName = config.tables.rangeIndex;
    this.docFieldsTableName = config.tables.docFields;
  }

  async loadDocFieldsState(
    docId: DocId,
  ): Promise<StructuredDocFieldsState | undefined> {
    const response = await this.client.getItem({
      TableName: this.docFieldsTableName,
      Key: { [structuredDocFieldsSchema.partitionKey]: docId },
    });

    if (!response.Item) {
      return undefined;
    }

    const item = response.Item as {
      fields?: StructuredDocFieldsRecord;
      version?: number;
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
    };
  }

  async putDocFieldsIfVersion(
    docId: DocId,
    expectedVersion: number | undefined,
    fields: StructuredDocFieldsRecord,
  ): Promise<boolean> {
    if (typeof expectedVersion === "undefined") {
      const createResult = await this.client.putItem({
        TableName: this.docFieldsTableName,
        Item: buildStructuredDocFieldsItem(docId, fields, 1),
        ConditionExpression: "attribute_not_exists(#docId)",
        ExpressionAttributeNames: {
          "#docId": structuredDocFieldsSchema.partitionKey,
        },
      });

      return !createResult.conditionFailed;
    }

    const nextVersion = expectedVersion + 1;
    const updateResult = await this.client.putItem({
      TableName: this.docFieldsTableName,
      Item: buildStructuredDocFieldsItem(docId, fields, nextVersion),
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
              [structuredTermIndexSchema.partitionKey]: entry.termKey,
              [structuredTermIndexSchema.sortKey]: entry.docId,
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
              [structuredRangeIndexSchema.partitionKey]: entry.field,
              [structuredRangeIndexSchema.sortKey]: entry.rangeKey,
            },
          },
        },
      })),
    );
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

  /**
   * @param config DynamoDB config for structured tables.
   */
  constructor(config: StructuredDdbConfig) {
    this.reader = new StructuredDdbReader(config);
    this.writer = new StructuredDdbWriter(
      new StructuredDdbWriterDependencies(config),
      {
        ...config.writerOptions,
        tokenizer:
          config.writerOptions?.tokenizer ?? config.tokenizer,
      },
    );
  }
}
