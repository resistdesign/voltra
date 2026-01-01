import type {
  AttributeValue,
  KeysAndAttributes as AwsKeysAndAttributes,
  WriteRequest as AwsWriteRequest,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import type {
  KeysAndAttributes,
  WriteRequest,
} from "../../src/api/Indexing/fulltext/ddbBackend";

/**
 * Converts a plain JavaScript record into a DynamoDB {@link AttributeValue} map.
 */
export const toAwsKey = (
  item: Record<string, unknown>,
): Record<string, AttributeValue> =>
  marshall(item) as Record<string, AttributeValue>;

/**
 * Converts a DynamoDB {@link AttributeValue} map back into a plain JavaScript record.
 */
export const fromAwsKey = (
  item: Record<string, AttributeValue>,
): Record<string, unknown> => unmarshall(item) as Record<string, unknown>;

/**
 * Transforms an indexing layer {@link WriteRequest} into the AWS SDK shape.
 */
export const toAwsWriteRequest = (request: WriteRequest): AwsWriteRequest => ({
  ...(request.PutRequest
    ? { PutRequest: { Item: toAwsKey(request.PutRequest.Item) } }
    : undefined),
  ...(request.DeleteRequest
    ? { DeleteRequest: { Key: toAwsKey(request.DeleteRequest.Key) } }
    : undefined),
});

/**
 * Converts an AWS SDK {@link AwsWriteRequest} to the internal indexing format.
 */
export const fromAwsWriteRequest = (
  request: AwsWriteRequest,
): WriteRequest => ({
  ...(request.PutRequest?.Item
    ? { PutRequest: { Item: fromAwsKey(request.PutRequest.Item) } }
    : undefined),
  ...(request.DeleteRequest?.Key
    ? { DeleteRequest: { Key: fromAwsKey(request.DeleteRequest.Key) } }
    : undefined),
});

/**
 * Maps a {@link KeysAndAttributes} entry into the AWS SDK representation for batch
 * retrieval operations.
 */
export const toAwsKeysAndAttributes = (
  entry: KeysAndAttributes,
): AwsKeysAndAttributes => ({
  Keys: entry.Keys.map((key) => toAwsKey(key)),
  ...(entry.ProjectionExpression
    ? { ProjectionExpression: entry.ProjectionExpression }
    : undefined),
});

/**
 * Converts AWS SDK batch key selection output into the indexing layer format.
 */
export const fromAwsKeysAndAttributes = (
  entry: AwsKeysAndAttributes,
): KeysAndAttributes => ({
  Keys: (entry.Keys ?? []).map((key) => fromAwsKey(key)),
  ...(entry.ProjectionExpression
    ? { ProjectionExpression: entry.ProjectionExpression }
    : undefined),
});
