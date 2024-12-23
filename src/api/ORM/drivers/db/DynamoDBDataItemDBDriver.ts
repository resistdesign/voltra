import { DataItemDBDriver } from "../Types";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { ListItemsConfig, ListItemsResults } from "../../../../common";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as UUIDV4 } from "uuid";
import { removeTypeReferenceFieldsFromDataItem } from "../../../../common/TypeParsing/Utils";
import { TypeInfo } from "../../../../common/TypeParsing/TypeInfo";

export const DYNAMODB_DATA_ITEM_DB_DRIVER_ERRORS = {
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
};

/**
 * The configuration for the {@link DynamoDBDataItemDBDriver}.
 * */
export type DynamoDBDataItemDBDriverConfig<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  dynamoDBClientConfig: any;
  typeInfo: TypeInfo;
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
      typeInfo,
      tableName,
      uniquelyIdentifyingFieldName,
      generateUniqueIdentifier = () => UUIDV4(),
    } = this.config;
    const {
      [uniquelyIdentifyingFieldName]: _unusedId,
      ...cleanNewItem
    }: ItemType = newItem as any;
    const newItemId = generateUniqueIdentifier(cleanNewItem as ItemType);
    const nonRelationalNewItem = removeTypeReferenceFieldsFromDataItem(
      cleanNewItem,
      typeInfo,
    );
    const cleanNewItemWithId: ItemType = {
      [uniquelyIdentifyingFieldName]: newItemId,
      ...nonRelationalNewItem,
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
    selectFields?: (keyof ItemType)[],
  ): Promise<Partial<ItemType>> => {
    const { tableName } = this.config;
    const selectedFieldParams =
      typeof selectFields !== "undefined"
        ? {
            ExpressionAttributeNames: selectFields.reduce(
              (acc: Record<string, string>, field) => {
                const fieldAsString = String(field);

                acc[`#${fieldAsString}`] = fieldAsString;

                return acc;
              },
              {} as Record<string, string>,
            ) as Record<string, string>,
            ProjectionExpression: selectFields
              .map((field) => `#${String(field)}`)
              .join(", "),
          }
        : {};
    const command = new GetItemCommand({
      TableName: tableName,
      Key: marshall({
        [this.config.uniquelyIdentifyingFieldName]: uniqueIdentifier,
      }),
      ...selectedFieldParams,
    });
    const { Item } = await this.dynamoDBClient.send(command);

    if (typeof Item === "undefined") {
      throw new Error(DYNAMODB_DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
    } else {
      const cleanItem = unmarshall(Item) as ItemType;

      return cleanItem;
    }
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
    selectFields?: (keyof ItemType)[],
  ): Promise<boolean | ListItemsResults<ItemType>> => {
    // Implement this method.
  };
}
