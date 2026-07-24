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
    Key: { pk: "doc", sk: "state" },
    ConsistentRead: true,
  });
  await client.batchGetItem({
    RequestItems: {
      Index: {
        Keys: [{ pk: "doc", sk: "state" }],
        ConsistentRead: true,
      },
    },
  });

  return {
    getItem: inputs[0]?.ConsistentRead,
    batchGetItem: (
      inputs[1]?.RequestItems as
        Record<string, { ConsistentRead?: boolean }> | undefined
    )?.Index?.ConsistentRead,
  };
};
