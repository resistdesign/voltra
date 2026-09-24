import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { createAwsSdkV3DynamoClient } from "./AwsSdkV3Adapter";

export const runAwsSdkV3ConsistencyMappingScenario = async () => {
  const inputs: Array<Record<string, unknown>> = [];
  const awsClient = {
    send: async (command: { input: Record<string, unknown> }) => {
      inputs.push(command.input);
      return {};
    },
  } as unknown as DynamoDBClient;
  const client = createAwsSdkV3DynamoClient(awsClient);

  await client.getItem({
    TableName: "Index",
    Key: { pk: "doc", sk: "state", ignored: undefined },
    ConsistentRead: true,
  });
  await client.batchGetItem({
    RequestItems: {
      Index: {
        Keys: [{ pk: "doc", sk: "state", ignored: undefined }],
        ConsistentRead: true,
      },
    },
  });
  await client.query({
    TableName: "Index",
    IndexName: "ExampleSecondaryIndex",
    KeyConditionExpression: "#kind = :kind",
    ExpressionAttributeNames: { "#kind": "kind" },
    ExpressionAttributeValues: { ":kind": "sd" },
  });

  const getItemKey = (inputs[0]?.Key ?? {}) as Record<string, unknown>;
  const batchGetRequestItems = inputs[1]?.RequestItems as
    | Record<string, { Keys?: Array<Record<string, unknown>>; ConsistentRead?: boolean }>
    | undefined;
  const batchGetItemKey = batchGetRequestItems?.Index?.Keys?.[0] ?? {};

  return {
    getItem: inputs[0]?.ConsistentRead,
    batchGetItem: batchGetRequestItems?.Index?.ConsistentRead,
    getItemKeyFields: Object.keys(getItemKey).sort(),
    batchGetItemKeyFields: Object.keys(batchGetItemKey).sort(),
    queryIndexName: inputs[2]?.IndexName,
  };
};
