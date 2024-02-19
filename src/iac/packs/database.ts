import { createResourcePack, SimpleCFT } from "../utils";

export type AddDatabaseConfig = {
  tableId: string;
  attributes: Record<string, string>;
  keys: Record<string, string>;
  billingMode?: "PAY_PER_REQUEST" | "PROVISIONED";
};

/**
 * Add a highly available key-value database with global scale performance.
 * */
export const addDatabase = createResourcePack(
  ({
    tableId,
    attributes,
    keys,
    billingMode = "PAY_PER_REQUEST",
  }: AddDatabaseConfig) =>
    new SimpleCFT().patch({
      Resources: {
        [tableId]: {
          Type: "AWS::DynamoDB::Table",
          Properties: {
            AttributeDefinitions: Object.keys(attributes).map(
              (attributeName) => ({
                AttributeName: attributeName,
                AttributeType: attributes[attributeName],
              }),
            ),
            KeySchema: Object.keys(keys).map((keyName) => ({
              AttributeName: keyName,
              KeyType: keys[keyName],
            })),
            BillingMode: billingMode,
          },
        },
      },
    }).template,
);
