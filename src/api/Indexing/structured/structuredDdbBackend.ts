/**
 * @packageDocumentation
 *
 * DynamoDB-backed structured indexing reader/writer implementations.
 */
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { DocId } from "../types.js";
import type { StructuredSearchDependencies } from "./searchStructured.js";
import type { StructuredQueryOptions, WhereValue } from "./types.js";
import {
  buildStructuredTermKey,
  serializeStructuredValue,
  structuredDocFieldsSchema,
  structuredRangeIndexSchema,
  structuredTermIndexSchema,
  type StructuredDocFieldsRecord,
  type StructuredRangeIndexItem,
  type StructuredRangeIndexKey,
  type StructuredTermIndexItem,
  type StructuredTermIndexKey,
} from "./structuredDdb.js";
import { StructuredDdbWriter, type StructuredWriterDependencies } from "./structuredWriter.js";

type DynamoKey = Record<string, any>;

type StructuredDdbConfig = {
  client: DynamoDBClient;
  termTableName?: string;
  rangeTableName?: string;
  docFieldsTableName?: string;
};

const decodeCursorKey = (cursor?: string): DynamoKey | undefined => {
  if (!cursor) {
    return undefined;
  }

  try {
    return marshall(JSON.parse(cursor));
  } catch (_error) {
    throw new Error("Invalid structured cursor token.");
  }
};

const encodeCursorKey = (key?: DynamoKey): string | undefined =>
  key ? JSON.stringify(unmarshall(key)) : undefined;

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
  private readonly client: DynamoDBClient;
  private readonly termTableName: string;
  private readonly rangeTableName: string;

  constructor(config: StructuredDdbConfig) {
    this.client = config.client;
    this.termTableName = config.termTableName ?? structuredTermIndexSchema.tableName;
    this.rangeTableName = config.rangeTableName ?? structuredRangeIndexSchema.tableName;
  }

  terms = {
    query: async (
      field: string,
      mode: "eq" | "contains",
      value: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> => {
      const termKey = buildStructuredTermKey(field, value, mode);
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.termTableName,
          KeyConditionExpression: "#termKey = :termKey",
          ExpressionAttributeNames: {
            "#termKey": structuredTermIndexSchema.partitionKey,
          },
          ExpressionAttributeValues: marshall({
            ":termKey": termKey,
          }),
          ExclusiveStartKey: decodeCursorKey(options.cursor),
          Limit: options.limit,
        }),
      );

      const items = (response.Items ?? []).map((item) => unmarshall(item) as StructuredTermIndexItem);
      const candidateIds = items.map((item) => item.docId);

      return {
        candidateIds,
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
  };

  ranges = {
    between: async (
      field: string,
      lower: WhereValue,
      upper: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> => {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.rangeTableName,
          KeyConditionExpression: "#field = :field AND #rangeKey BETWEEN :lower AND :upper",
          ExpressionAttributeNames: {
            "#field": structuredRangeIndexSchema.partitionKey,
            "#rangeKey": structuredRangeIndexSchema.sortKey,
          },
          ExpressionAttributeValues: marshall({
            ":field": field,
            ":lower": buildRangeLowerKey(lower),
            ":upper": buildRangeUpperKey(upper),
          }),
          ExclusiveStartKey: decodeCursorKey(options.cursor),
          Limit: options.limit,
        }),
      );

      const items = (response.Items ?? []).map((item) => unmarshall(item) as StructuredRangeIndexItem);
      const candidateIds = items.map((item) => item.docId);

      return {
        candidateIds,
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
    gte: async (
      field: string,
      lower: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> => {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.rangeTableName,
          KeyConditionExpression: "#field = :field AND #rangeKey >= :lower",
          ExpressionAttributeNames: {
            "#field": structuredRangeIndexSchema.partitionKey,
            "#rangeKey": structuredRangeIndexSchema.sortKey,
          },
          ExpressionAttributeValues: marshall({
            ":field": field,
            ":lower": buildRangeLowerKey(lower),
          }),
          ExclusiveStartKey: decodeCursorKey(options.cursor),
          Limit: options.limit,
        }),
      );

      const items = (response.Items ?? []).map((item) => unmarshall(item) as StructuredRangeIndexItem);
      const candidateIds = items.map((item) => item.docId);

      return {
        candidateIds,
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
    lte: async (
      field: string,
      upper: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> => {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.rangeTableName,
          KeyConditionExpression: "#field = :field AND #rangeKey <= :upper",
          ExpressionAttributeNames: {
            "#field": structuredRangeIndexSchema.partitionKey,
            "#rangeKey": structuredRangeIndexSchema.sortKey,
          },
          ExpressionAttributeValues: marshall({
            ":field": field,
            ":upper": buildRangeUpperKey(upper),
          }),
          ExclusiveStartKey: decodeCursorKey(options.cursor),
          Limit: options.limit,
        }),
      );

      const items = (response.Items ?? []).map((item) => unmarshall(item) as StructuredRangeIndexItem);
      const candidateIds = items.map((item) => item.docId);

      return {
        candidateIds,
        lastEvaluatedKey: encodeCursorKey(response.LastEvaluatedKey),
      };
    },
  };
}

class StructuredDdbWriterDependencies implements StructuredWriterDependencies {
  private readonly client: DynamoDBClient;
  private readonly termTableName: string;
  private readonly rangeTableName: string;
  private readonly docFieldsTableName: string;

  constructor(config: StructuredDdbConfig) {
    this.client = config.client;
    this.termTableName = config.termTableName ?? structuredTermIndexSchema.tableName;
    this.rangeTableName = config.rangeTableName ?? structuredRangeIndexSchema.tableName;
    this.docFieldsTableName = config.docFieldsTableName ?? structuredDocFieldsSchema.tableName;
  }

  async loadDocFields(docId: DocId): Promise<StructuredDocFieldsRecord | undefined> {
    const response = await this.client.send(
      new GetItemCommand({
        TableName: this.docFieldsTableName,
        Key: marshall({ [structuredDocFieldsSchema.partitionKey]: docId }),
      }),
    );

    if (!response.Item) {
      return undefined;
    }

    const item = unmarshall(response.Item) as { fields?: StructuredDocFieldsRecord };
    return item.fields;
  }

  async putDocFields(docId: DocId, fields: StructuredDocFieldsRecord): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: this.docFieldsTableName,
        Item: marshall({
          [structuredDocFieldsSchema.partitionKey]: docId,
          [structuredDocFieldsSchema.fieldsAttribute]: fields,
        }),
      }),
    );
  }

  async putTermEntries(entries: StructuredTermIndexItem[]): Promise<void> {
    await this.batchWrite(entries.map((entry) => ({
      tableName: this.termTableName,
      request: { PutRequest: { Item: marshall(entry) } },
    })));
  }

  async deleteTermEntries(entries: StructuredTermIndexKey[]): Promise<void> {
    await this.batchWrite(entries.map((entry) => ({
      tableName: this.termTableName,
      request: {
        DeleteRequest: {
          Key: marshall({
            [structuredTermIndexSchema.partitionKey]: entry.termKey,
            [structuredTermIndexSchema.sortKey]: entry.docId,
          }),
        },
      },
    })));
  }

  async putRangeEntries(entries: StructuredRangeIndexItem[]): Promise<void> {
    await this.batchWrite(entries.map((entry) => ({
      tableName: this.rangeTableName,
      request: { PutRequest: { Item: marshall(entry) } },
    })));
  }

  async deleteRangeEntries(entries: StructuredRangeIndexKey[]): Promise<void> {
    await this.batchWrite(entries.map((entry) => ({
      tableName: this.rangeTableName,
      request: {
        DeleteRequest: {
          Key: marshall({
            [structuredRangeIndexSchema.partitionKey]: entry.field,
            [structuredRangeIndexSchema.sortKey]: entry.rangeKey,
          }),
        },
      },
    })));
  }

  private async batchWrite(
    requests: Array<{ tableName: string; request: Record<string, unknown> }>,
  ): Promise<void> {
    const batches = chunk(requests, 25);

    for (const batch of batches) {
      let requestItems = batch.reduce<Record<string, any[]>>(
        (acc, { tableName, request }) => {
          acc[tableName] = acc[tableName] ?? [];
          acc[tableName].push(request);
          return acc;
        },
        {},
      );

      while (Object.keys(requestItems).length > 0) {
        const response = await this.client.send(
          new BatchWriteItemCommand({
            RequestItems: requestItems,
          }),
        );

        requestItems = response.UnprocessedItems ?? {};
      }
    }
  }
}

/**
 * Convenience wrapper that exposes both the reader and writer.
 */
export class StructuredDdbBackend {
  readonly reader: StructuredSearchDependencies;
  readonly writer: StructuredDdbWriter;

  constructor(config: StructuredDdbConfig) {
    this.reader = new StructuredDdbReader(config);
    this.writer = new StructuredDdbWriter(new StructuredDdbWriterDependencies(config));
  }
}
