import {
  BatchGetItemCommand,
  BatchWriteItemCommand,
  ConditionalCheckFailedException,
  type AttributeValue,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  type KeysAndAttributes as AwsKeysAndAttributes,
  type WriteRequest as AwsWriteRequest,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import type {
  BatchGetItemInput,
  BatchGetItemOutput,
  BatchWriteItemInput,
  BatchWriteItemOutput,
  DynamoBatchWriter,
  DynamoQueryClient,
  GetItemInput,
  GetItemOutput,
  KeysAndAttributes,
  PutItemInput,
  PutItemOutput,
  QueryInput,
  QueryOutput,
  WriteRequest,
} from "./Types";

type AttributeMap = Record<string, unknown>;

export type BatchWriteWithRetryOptions = {
  maxRetries?: number;
  onRetry?: (attempt: number, pending: Record<string, WriteRequest[]>) => void;
};

const toAwsKey = (
  item: AttributeMap,
): Record<string, AttributeValue> =>
  marshall(item) as Record<string, AttributeValue>;

const fromAwsKey = (item: Record<string, AttributeValue>): AttributeMap =>
  unmarshall(item) as AttributeMap;

const toAwsWriteRequest = (request: WriteRequest): AwsWriteRequest => ({
  ...(request.PutRequest
    ? { PutRequest: { Item: toAwsKey(request.PutRequest.Item) } }
    : undefined),
  ...(request.DeleteRequest
    ? { DeleteRequest: { Key: toAwsKey(request.DeleteRequest.Key) } }
    : undefined),
});

const fromAwsWriteRequest = (request: AwsWriteRequest): WriteRequest => ({
  ...(request.PutRequest?.Item
    ? { PutRequest: { Item: fromAwsKey(request.PutRequest.Item) } }
    : undefined),
  ...(request.DeleteRequest?.Key
    ? { DeleteRequest: { Key: fromAwsKey(request.DeleteRequest.Key) } }
    : undefined),
});

const toAwsKeysAndAttributes = (
  entry: KeysAndAttributes,
): AwsKeysAndAttributes => ({
  Keys: entry.Keys.map((key) => toAwsKey(key)),
  ...(entry.ProjectionExpression
    ? { ProjectionExpression: entry.ProjectionExpression }
    : undefined),
});

const fromAwsKeysAndAttributes = (
  entry: AwsKeysAndAttributes,
): KeysAndAttributes => ({
  Keys: (entry.Keys ?? []).map((key) => fromAwsKey(key)),
  ...(entry.ProjectionExpression
    ? { ProjectionExpression: entry.ProjectionExpression }
    : undefined),
});

export const createAwsSdkV3DynamoClient = (
  client: DynamoDBClient,
): DynamoQueryClient => ({
  batchWriteItem: async (
    input: BatchWriteItemInput,
  ): Promise<BatchWriteItemOutput> => {
    const awsInput = {
      RequestItems: Object.fromEntries(
        Object.entries(input.RequestItems).map(([tableName, requests]) => [
          tableName,
          requests.map((request) => toAwsWriteRequest(request)),
        ]),
      ),
    };
    const response = await client.send(new BatchWriteItemCommand(awsInput));
    const unprocessed = response.UnprocessedItems ?? {};

    return {
      UnprocessedItems: Object.fromEntries(
        Object.entries(unprocessed).map(([tableName, requests]) => [
          tableName,
          requests.map((request) => fromAwsWriteRequest(request)),
        ]),
      ),
    };
  },
  batchGetItem: async (
    input: BatchGetItemInput,
  ): Promise<BatchGetItemOutput> => {
    const awsInput = {
      RequestItems: Object.fromEntries(
        Object.entries(input.RequestItems).map(([tableName, entry]) => [
          tableName,
          toAwsKeysAndAttributes(entry),
        ]),
      ),
    };
    const response = await client.send(new BatchGetItemCommand(awsInput));
    const responses = response.Responses ?? {};
    const unprocessed = response.UnprocessedKeys ?? {};

    return {
      Responses: Object.fromEntries(
        Object.entries(responses).map(([tableName, items]) => [
          tableName,
          (items ?? []).map((item) => fromAwsKey(item)),
        ]),
      ),
      UnprocessedKeys: Object.fromEntries(
        Object.entries(unprocessed).map(([tableName, entry]) => [
          tableName,
          fromAwsKeysAndAttributes(entry),
        ]),
      ),
    };
  },
  getItem: async (input: GetItemInput): Promise<GetItemOutput> => {
    const response = await client.send(
      new GetItemCommand({
        TableName: input.TableName,
        Key: toAwsKey(input.Key),
      }),
    );

    return {
      Item: response.Item ? fromAwsKey(response.Item) : undefined,
    };
  },
  putItem: async (input: PutItemInput): Promise<PutItemOutput> => {
    try {
      await client.send(
        new PutItemCommand({
          TableName: input.TableName,
          Item: toAwsKey(input.Item),
          ConditionExpression: input.ConditionExpression,
          ExpressionAttributeNames: input.ExpressionAttributeNames,
          ExpressionAttributeValues: input.ExpressionAttributeValues
            ? toAwsKey(input.ExpressionAttributeValues)
            : undefined,
        }),
      );
      return {};
    } catch (error: unknown) {
      if (error instanceof ConditionalCheckFailedException) {
        return { conditionFailed: true };
      }
      throw error;
    }
  },
  query: async (input: QueryInput): Promise<QueryOutput> => {
    const response = await client.send(
      new QueryCommand({
        TableName: input.TableName,
        KeyConditionExpression: input.KeyConditionExpression,
        ExpressionAttributeNames: input.ExpressionAttributeNames,
        ExpressionAttributeValues: toAwsKey(input.ExpressionAttributeValues),
        ExclusiveStartKey: input.ExclusiveStartKey
          ? toAwsKey(input.ExclusiveStartKey)
          : undefined,
        Limit: input.Limit,
      }),
    );

    return {
      Items: response.Items
        ? response.Items.map((item) => fromAwsKey(item))
        : undefined,
      LastEvaluatedKey: response.LastEvaluatedKey
        ? fromAwsKey(response.LastEvaluatedKey)
        : undefined,
    };
  },
});

export const batchWriteWithRetry = async (
  client: DynamoBatchWriter,
  requestItems: Record<string, WriteRequest[]>,
  options: BatchWriteWithRetryOptions = {},
): Promise<void> => {
  let pending: Record<string, WriteRequest[]> | undefined = requestItems;
  let attempts = 0;

  while (pending && Object.keys(pending).length > 0) {
    const response = await client.batchWriteItem({ RequestItems: pending });
    pending = response.UnprocessedItems;

    if (pending && Object.keys(pending).length > 0) {
      attempts += 1;
      options.onRetry?.(attempts, pending);
      if (options.maxRetries !== undefined && attempts > options.maxRetries) {
        throw new Error("DynamoDB batch write retries exceeded.");
      }
    }
  }
};
