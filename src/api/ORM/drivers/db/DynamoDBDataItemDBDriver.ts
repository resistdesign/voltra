import { DataItemDBDriver } from "../Types";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { ListItemsConfig, ListItemsResults } from "../../../../common";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as UUIDV4 } from "uuid";

/**
 * The configuration for the {@link DynamoDBDataItemDBDriver}.
 * */
export type DynamoDBDataItemDBDriverConfig<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  dynamoDBClientConfig: any;
  tableName: string;
  uniquelyIdentifyingFieldName: UniquelyIdentifyingFieldName;
  generateUniqueIdentifier?: (targetItem: ItemType) => string;
};

// TODO: Important: ONLY WORK WITH NON-RELATIONAL FIELDS.

/**
 * A {@link DataItemDBDriver} that uses DynamoDB as its database.
 * */
export class DynamoDBDataItemDBDriver<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> implements DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>
{
  protected dynamoDBClient: DynamoDBClient;

  constructor(
    protected config: DynamoDBDataItemDBDriverConfig<
      ItemType,
      UniquelyIdentifyingFieldName
    >,
  ) {
    this.dynamoDBClient = new DynamoDBClient(config.dynamoDBClientConfig);
  }

  /**
   * Create an item in the database.
   */
  public createItem = async (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ): Promise<ItemType[UniquelyIdentifyingFieldName]> => {
    const {
      tableName,
      uniquelyIdentifyingFieldName,
      generateUniqueIdentifier = () => UUIDV4(),
    } = this.config;
    const {
      [uniquelyIdentifyingFieldName]: _unusedId,
      ...cleanNewItem
    }: ItemType = newItem as any;
    const newItemId = generateUniqueIdentifier(cleanNewItem as ItemType);
    const cleanNewItemWithId: ItemType = {
      [uniquelyIdentifyingFieldName]: newItemId,
      ...cleanNewItem,
    } as any;
    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(cleanNewItemWithId),
    });

    await this.dynamoDBClient.send(command);

    return newItemId as ItemType[UniquelyIdentifyingFieldName];
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
