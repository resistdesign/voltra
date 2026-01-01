import {
  BatchGetItemCommand,
  BatchWriteItemCommand,
  GetItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import {
  type BatchGetItemInput,
  type BatchGetItemOutput,
  type BatchWriteItemInput,
  type BatchWriteItemOutput,
  FullTextDdbBackend,
  type GetItemInput,
  type GetItemOutput,
  type QueryInput,
  type QueryOutput,
} from "../../src/api/Indexing";
import { ddbClient } from "./ddbClient";
import {
  fromAwsKey,
  fromAwsKeysAndAttributes,
  fromAwsWriteRequest,
  toAwsKey,
  toAwsKeysAndAttributes,
  toAwsWriteRequest,
} from "./awsConversions";

/**
 * Builds a {@link FullTextDdbBackend} wired to the shared DynamoDB client with the
 * necessary AWS SDK conversions.
 */
export const createFullTextBackend = () =>
  new FullTextDdbBackend({
    client: {
      /**
       * Writes batches of items with conversion to DynamoDB shapes, returning any
       * unprocessed requests in the internal format.
       */
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
        const response = await ddbClient.send(
          new BatchWriteItemCommand(awsInput),
        );
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
      /**
       * Retrieves batches of items by delegating to DynamoDB and converting both
       * input and output payloads.
       */
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
        const response = await ddbClient.send(
          new BatchGetItemCommand(awsInput),
        );
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
      /**
       * Fetches a single item from DynamoDB using marshalled keys.
       */
      getItem: async (input: GetItemInput): Promise<GetItemOutput> => {
        const response = await ddbClient.send(
          new GetItemCommand({
            TableName: input.TableName,
            Key: toAwsKey(input.Key),
          }),
        );

        return {
          Item: response.Item ? fromAwsKey(response.Item) : undefined,
        };
      },
      /**
       * Runs a DynamoDB query while handling marshalling for keys and expressions.
       */
      query: async (input: QueryInput): Promise<QueryOutput> => {
        const response = await ddbClient.send(
          new QueryCommand({
            TableName: input.TableName,
            KeyConditionExpression: input.KeyConditionExpression,
            ExpressionAttributeNames: input.ExpressionAttributeNames,
            ExpressionAttributeValues: toAwsKey(
              input.ExpressionAttributeValues,
            ),
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
    },
  });

/**
 * Shared singleton instance of the full-text backend used by the API route map.
 */
export const fullTextBackend = createFullTextBackend();
