import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/**
 * Shared DynamoDB client instance used by all API backends.
 */
export const ddbClient = new DynamoDBClient({});
