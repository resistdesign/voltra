import { BatchWriteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import {
  RelationalDdbBackend,
  relationEdgesSchema,
  type RelationEdgesDdbItem,
  type RelationEdgesDdbKey,
} from "../../src/api/Indexing";
import type { WriteRequest } from "../../src/api/Indexing/fulltext/ddbBackend";
import { ddbClient } from "./ddbClient";
import { fromAwsWriteRequest, toAwsWriteRequest } from "./awsConversions";

/**
 * Performs a DynamoDB batch write, retrying until all items are processed.
 */
const batchWriteWithRetry = async (
  requestItems: Record<string, WriteRequest[]>,
): Promise<void> => {
  let pending = requestItems;

  while (Object.keys(pending).length > 0) {
    const awsRequestItems = Object.fromEntries(
      Object.entries(pending).map(([tableName, requests]) => [
        tableName,
        requests.map((request) => toAwsWriteRequest(request)),
      ]),
    );
    const response = await ddbClient.send(
      new BatchWriteItemCommand({
        RequestItems: awsRequestItems,
      }),
    );
    const unprocessed = response.UnprocessedItems ?? {};
    pending = Object.fromEntries(
      Object.entries(unprocessed).map(([tableName, requests]) => [
        tableName,
        requests.map((request) => fromAwsWriteRequest(request)),
      ]),
    );
  }
};

/**
 * DynamoDB-backed implementation of the relations backend used by the ORM layer.
 */
export const relationalBackend = new RelationalDdbBackend({
  /**
   * Persists relation edges in chunks, retrying DynamoDB batch writes when
   * throttled.
   */
  putEdges: async (items: RelationEdgesDdbItem[]) => {
    const chunks: RelationEdgesDdbItem[][] = [];
    for (let index = 0; index < items.length; index += 25) {
      chunks.push(items.slice(index, index + 25));
    }

    for (const chunk of chunks) {
      await batchWriteWithRetry({
        [relationEdgesSchema.tableName]: chunk.map((item) => ({
          PutRequest: { Item: item as Record<string, unknown> },
        })),
      });
    }
  },
  /**
   * Deletes relation edges in batches with retry handling for unprocessed items.
   */
  deleteEdges: async (keys: RelationEdgesDdbKey[]) => {
    const chunks: RelationEdgesDdbKey[][] = [];
    for (let index = 0; index < keys.length; index += 25) {
      chunks.push(keys.slice(index, index + 25));
    }

    for (const chunk of chunks) {
      await batchWriteWithRetry({
        [relationEdgesSchema.tableName]: chunk.map((key) => ({
          DeleteRequest: { Key: key as Record<string, unknown> },
        })),
      });
    }
  },
  /**
   * Queries relation edges for a given edge key, supporting pagination.
   */
  queryEdges: async ({ edgeKey, limit, exclusiveStartKey }) => {
    const response = await ddbClient.send(
      new QueryCommand({
        TableName: relationEdgesSchema.tableName,
        KeyConditionExpression: "#edgeKey = :edgeKey",
        ExpressionAttributeNames: {
          "#edgeKey": relationEdgesSchema.partitionKey,
        },
        ExpressionAttributeValues: marshall({
          ":edgeKey": edgeKey,
        }),
        ExclusiveStartKey: exclusiveStartKey
          ? marshall(exclusiveStartKey)
          : undefined,
        Limit: limit,
      }),
    );

    return {
      items: (response.Items ?? []).map(
        (item) => unmarshall(item) as RelationEdgesDdbItem,
      ),
      lastEvaluatedKey: response.LastEvaluatedKey
        ? (unmarshall(response.LastEvaluatedKey) as RelationEdgesDdbKey)
        : undefined,
    };
  },
});
