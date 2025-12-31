import {
  addRouteMapToRouteMap,
  addRoutesToRouteMap,
  AWS,
  handleCloudFunctionEvent,
} from "../../src/api/Router";
import { CloudFunctionResponse, RouteMap } from "../../src/api/Router/Types";
import { getTypeInfoORMRouteMap } from "../../src/api/ORM";
import { TypeInfo } from "../../src/common/TypeParsing/TypeInfo";
import { DynamoDBDataItemDBDriver } from "../../src/api/ORM/drivers";
import { DEMO_ORM_ROUTE_PATH } from "../common/Constants";
import {
  ERROR_MESSAGE_CONSTANTS,
  PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
} from "../../src/common/TypeParsing/Validation";
import { TypeInfoORMServiceError } from "../../src/common/TypeInfoORM";
import {
  FullTextDdbBackend,
  RelationalDdbBackend,
  type RelationEdgesDdbItem,
  type RelationEdgesDdbKey,
  relationEdgesSchema,
  StructuredDdbBackend,
} from "../../src/api/Indexing";
import type {
  BatchGetItemInput,
  BatchGetItemOutput,
  BatchWriteItemInput,
  BatchWriteItemOutput,
  GetItemInput,
  GetItemOutput,
  KeysAndAttributes,
  QueryInput,
  QueryOutput,
  WriteRequest,
} from "../../src/api/Indexing/fulltext/ddbBackend";
import {
  type AttributeValue,
  BatchGetItemCommand,
  BatchWriteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  type KeysAndAttributes as AwsKeysAndAttributes,
  QueryCommand,
  type WriteRequest as AwsWriteRequest,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DemoTypeInfoMap } from "../common/DemoTypeInfoMap";
import normalizeCloudFunctionEvent = AWS.normalizeCloudFunctionEvent;

const ROUTE_MAP: RouteMap = addRoutesToRouteMap({}, [
  {
    path: "/hello",
    handler: async () => {
      return "UPDATES! :D";
    },
    authConfig: {
      public: true,
    },
  },
]);
const ddbClient = new DynamoDBClient({});
const toAwsKey = (
  item: Record<string, unknown>,
): Record<string, AttributeValue> =>
  marshall(item) as Record<string, AttributeValue>;
const fromAwsKey = (
  item: Record<string, AttributeValue>,
): Record<string, unknown> => unmarshall(item) as Record<string, unknown>;
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
const fullTextBackend = new FullTextDdbBackend({
  client: {
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
      const response = await ddbClient.send(new BatchGetItemCommand(awsInput));
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
    query: async (input: QueryInput): Promise<QueryOutput> => {
      const response = await ddbClient.send(
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
  },
});
const structuredBackend = new StructuredDdbBackend({ client: ddbClient });
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
const relationalBackend = new RelationalDdbBackend({
  putEdges: async (items: RelationEdgesDdbItem[]) => {
    const chunks: RelationEdgesDdbItem[][] = [];
    for (let index = 0; index < items.length; index += 25) {
      chunks.push(items.slice(index, index + 25));
    }

    for (const chunk of chunks) {
      await batchWriteWithRetry({
        [relationEdgesSchema.tableName]: chunk.map((item) => ({
          PutRequest: { Item: marshall(item) },
        })),
      });
    }
  },
  deleteEdges: async (keys: RelationEdgesDdbKey[]) => {
    const chunks: RelationEdgesDdbKey[][] = [];
    for (let index = 0; index < keys.length; index += 25) {
      chunks.push(keys.slice(index, index + 25));
    }

    for (const chunk of chunks) {
      await batchWriteWithRetry({
        [relationEdgesSchema.tableName]: chunk.map((key) => ({
          DeleteRequest: { Key: marshall(key) },
        })),
      });
    }
  },
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
const ROUTE_MAP_WITH_DB: RouteMap = addRouteMapToRouteMap(
  ROUTE_MAP,
  getTypeInfoORMRouteMap(
    {
      typeInfoMap: DemoTypeInfoMap,
      getDriver: (typeName: string) => {
        const { primaryField }: Partial<TypeInfo> =
          DemoTypeInfoMap[typeName] || {};

        if (primaryField) {
          return new DynamoDBDataItemDBDriver({
            tableName: typeName,
            uniquelyIdentifyingFieldName: primaryField,
          });
        } else {
          throw new Error("Invalid type.");
        }
      },
      indexing: {
        fullText: {
          backend: fullTextBackend,
          defaultIndexFieldByType: {
            Person: "lastName",
            Car: "model",
          },
        },
        structured: {
          reader: structuredBackend.reader,
          writer: structuredBackend.writer,
        },
        relations: {
          backend: relationalBackend,
          relationNameFor: (fromTypeName, fromTypeFieldName) =>
            `${fromTypeName}.${fromTypeFieldName}`,
        },
      },
    },
    undefined,
    undefined,
    {
      public: true,
    },
  ),
  DEMO_ORM_ROUTE_PATH,
);

export const handler = async (event: any): Promise<CloudFunctionResponse> =>
  handleCloudFunctionEvent(
    event,
    normalizeCloudFunctionEvent,
    ROUTE_MAP_WITH_DB,
    [
      process.env.CLIENT_ORIGIN as string,
      process.env.DEV_CLIENT_ORIGIN as string,
    ],
    // TODO: What to really do with this?
    //  How do we decide which errors should go to the client?
    (error: unknown): boolean => {
      if (error && typeof error === "object" && "error" in error) {
        const { error: mainError } = error;

        if (typeof mainError === "string") {
          const primitiveErrorValues = Object.values(
            PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
          );
          const validationErrorValues = Object.values(ERROR_MESSAGE_CONSTANTS);
          const typeInfoORMErrorValues = Object.values(TypeInfoORMServiceError);

          if (primitiveErrorValues.includes(mainError)) {
            return true;
          }

          if (validationErrorValues.includes(mainError)) {
            return true;
          }

          if (
            typeInfoORMErrorValues.includes(
              mainError as TypeInfoORMServiceError,
            )
          ) {
            return true;
          }
        }
      }

      return false;
    },
    true, // debug
  );
