/**
 * @packageDocumentation
 *
 * DynamoDB table pack with configurable keys, attributes, and billing mode.
 */
import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";

/** Configuration for one DynamoDB global secondary index. */
export type AddDatabaseGlobalSecondaryIndexConfig = {
  /** CloudFormation/DynamoDB index name. */
  indexName: string;
  /** HASH/RANGE key schema for the secondary index. */
  keys: Record<string, "HASH" | "RANGE">;
  /**
   * Projection mode. Object form emits an INCLUDE projection.
   * Defaults to ALL.
   */
  projection?: "ALL" | "KEYS_ONLY" | { nonKeyAttributes: string[] };
};

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
  /** Optional global secondary indexes. */
  globalSecondaryIndexes?: AddDatabaseGlobalSecondaryIndexConfig[];
};

/**
 * Add a highly available key-value database with global scale performance.
 *
 * @param config - Database configuration.
 * @group Resource Packs
 * */
export const addDatabase = createResourcePack(
  ({
    tableId,
    tableName,
    keys,
    attributes,
    billingMode = "PAY_PER_REQUEST",
    globalSecondaryIndexes = [],
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
            ...(globalSecondaryIndexes.length > 0
              ? {
                  GlobalSecondaryIndexes: globalSecondaryIndexes.map((index) => {
                    const projection =
                      typeof index.projection === "object"
                        ? {
                            ProjectionType: "INCLUDE",
                            NonKeyAttributes: index.projection.nonKeyAttributes,
                          }
                        : {
                            ProjectionType: index.projection ?? "ALL",
                          };

                    return {
                      IndexName: index.indexName,
                      KeySchema: Object.keys(index.keys).map((keyName) => ({
                        AttributeName: keyName,
                        KeyType: index.keys[keyName],
                      })),
                      Projection: projection,
                    };
                  }),
                }
              : {}),
          },
        },
      },
    }).template,
);
