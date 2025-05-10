import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";

/**
 * The configuration for adding a database to a stack.
 * */
export type AddDatabaseConfig = {
  /**
   * The id of the database table in a stack.
   * */
  tableId: string;
  /**
   * The name of the database table.
   * */
  tableName?: string;
  /**
   * The keys for the database table.
   * */
  keys: Record<string, "HASH" | "RANGE">;
  /**
   * Specific attributes for the database table.
   * */
  attributes: Record<
    string,
    "S" | "N" | "B" | "BOOL" | "NULL" | "M" | "L" | "SS" | "NS" | "BS"
  >;
  /**
   * The billing mode for the database table.
   * */
  billingMode?: "PAY_PER_REQUEST" | "PROVISIONED";
};

/**
 * Add a highly available key-value database with global scale performance.
 * */
export const addDatabase = createResourcePack(
  ({
    tableId,
    tableName,
    keys,
    attributes,
    billingMode = "PAY_PER_REQUEST",
  }: AddDatabaseConfig) =>
    new SimpleCFT().patch({
      Resources: {
        [tableId]: {
          Type: "AWS::DynamoDB::Table",
          Properties: {
            TableName: tableName,
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
