import { DataItemDBDriver } from "../Types";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ListItemsConfig, ListItemsResults } from "../../../../common";

/**
 * The configuration for the {@link DynamoDBDataItemDBDriver}.
 * */
export type DynamoDBDataItemDBDriverConfig = {
  dynamoDBClientConfig: any;
};

/**
 * A {@link DataItemDBDriver} that uses DynamoDB as its database.
 * */
export class DynamoDBDataItemDBDriver<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> implements DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>
{
  protected dynamoDBClient: DynamoDBClient;

  constructor(protected config: DynamoDBDataItemDBDriverConfig) {
    this.dynamoDBClient = new DynamoDBClient(config.dynamoDBClientConfig);
  }

  /**
   * Create an item in the database.
   */
  public createItem = async (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ): Promise<ItemType[UniquelyIdentifyingFieldName]> => {
    // Implement this method.
  };

  /**
   * Read an item from the database.
   */
  public readItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ): Promise<ItemType> => {
    // Implement this method.
  };

  /**
   * Update an item in the database.
   */
  public updateItem = async (
    updatedItem: Partial<ItemType>,
  ): Promise<boolean> => {
    // Implement this method.
  };

  /**
   * Delete an item from the database.
   */
  public deleteItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ): Promise<boolean> => {
    // Implement this method.
  };

  /**
   * List items from the database.
   */
  public listItems = async (
    config: ListItemsConfig,
  ): Promise<boolean | ListItemsResults<ItemType>> => {
    // Implement this method.
  };
}
