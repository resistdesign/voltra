import { DataItemDBDriver } from "../Types";
import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { ListItemsConfig, ListItemsResults } from "../../../../common";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as UUIDV4 } from "uuid";
import { removeTypeReferenceFieldsFromDataItem } from "../../../../common/TypeParsing/Utils";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoField,
} from "../../../../common/TypeParsing/TypeInfo";
import {
  FieldCriterion,
  LogicalOperators,
  SearchCriteria,
} from "../../../../common/SearchTypes";

const buildUpdateExpression = (
  updatedItem: Partial<TypeInfoDataItem>,
  typeInfo: TypeInfo,
  uniquelyIdentifyingFieldName: any,
) => {
  const { fields = {} } = typeInfo;
  const updateExpressionParts: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, any> = {};

  for (const f in fields) {
    const { typeReference } = fields[f];
    const value = updatedItem[f];

    // IMPORTANT: DO NOT use the `primaryField`, only use non-relational fields and there must be a value.
    if (
      f !== uniquelyIdentifyingFieldName &&
      typeof typeReference === "undefined" &&
      typeof value !== "undefined"
    ) {
      const placeholderName = `#${f}`;
      const placeholderValue = `:${f}`;

      updateExpressionParts.push(`${placeholderName} = ${placeholderValue}`);
      attributeNames[placeholderName] = f;
      attributeValues[placeholderValue] = marshall(value);
    }
  }

  return {
    UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
  };
};

const buildSelectedFieldParams = <ItemType extends TypeInfoDataItem>(
  selectFields?: (keyof ItemType)[],
) => {
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

  return selectedFieldParams;
};

// TODO: Maybe these should be universal, at the API level.
/**
 * The errors that can be thrown by the {@link DynamoDBDataItemDBDriver}.
 * */
export const DYNAMODB_DATA_ITEM_DB_DRIVER_ERRORS = {
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  INVALID_CRITERION_VALUE: "INVALID_CRITERION_VALUE",
};

/**
 * The configuration for the {@link DynamoDBDataItemDBDriver}.
 * */
export type DynamoDBDataItemDBDriverConfig<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  dynamoDBClientConfig: any;
  typeName: string;
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
    const { tableName, uniquelyIdentifyingFieldName } = this.config;
    const selectedFieldParams = buildSelectedFieldParams(selectFields);
    const command = new GetItemCommand({
      TableName: tableName,
      Key: marshall({
        [uniquelyIdentifyingFieldName]: uniqueIdentifier,
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
    const { typeInfo, tableName, uniquelyIdentifyingFieldName } = this.config;
    // SECURITY: Remove the uniquely identifying field from the updated item.
    const {
      [uniquelyIdentifyingFieldName]: _unusedId,
      ...cleanUpdatedItem
    }: ItemType = updatedItem as any;
    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: marshall({
        [uniquelyIdentifyingFieldName]:
          updatedItem[uniquelyIdentifyingFieldName],
      }),
      ReturnValues: "ALL_NEW",
      ...buildUpdateExpression(
        cleanUpdatedItem,
        typeInfo,
        uniquelyIdentifyingFieldName,
      ),
    });
    const { Attributes } = await this.dynamoDBClient.send(command);

    return !!Attributes;
  };

  /**
   * Delete an item from the database.
   */
  public deleteItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ): Promise<boolean> => {
    const { tableName, uniquelyIdentifyingFieldName } = this.config;
    const command = new DeleteItemCommand({
      TableName: tableName,
      Key: marshall({
        [uniquelyIdentifyingFieldName]: uniqueIdentifier,
      }),
      ReturnValues: "ALL_OLD",
    });
    const { Attributes } = await this.dynamoDBClient.send(command);

    return !!Attributes;
  };

  /**
   * List items from the database.
   */
  public listItems = async (
    config: ListItemsConfig,
    selectFields?: (keyof ItemType)[],
  ): Promise<boolean | ListItemsResults<ItemType>> => {
    const { typeName, typeInfo, tableName, uniquelyIdentifyingFieldName } =
      this.config;
    const { fields = {} } = typeInfo;
    const {
      itemsPerPage = 10,
      cursor,
      sortFields,
      criteria: {
        logicalOperator = LogicalOperators.AND,
        fieldCriteria = [],
      } = {} as SearchCriteria,
      checkExistence = false,
    } = config;
    const selectedFieldParams = buildSelectedFieldParams(selectFields);
    // TODO: What to do with the logical operator?
    const searchKeyValues: Record<string, any> = {};

    for (const fC of fieldCriteria) {
      const { fieldName, value, operator, valueOptions }: FieldCriterion = fC;
      const { typeReference, possibleValues }: Partial<TypeInfoField> =
        fields[fieldName] || {};

      // IMPORTANT: Only allow searching for `possibleValues` when supplied.
      if (
        Array.isArray(possibleValues) &&
        ((Array.isArray(valueOptions) &&
          !valueOptions.every((vO) => possibleValues.includes(vO))) ||
          !possibleValues.includes(value))
      ) {
        throw {
          message: DYNAMODB_DATA_ITEM_DB_DRIVER_ERRORS.INVALID_CRITERION_VALUE,
          typeName,
          fieldName,
          value,
        };
      }

      // IMPORTANT: Use only non-relational fields.
      if (typeof typeReference === "undefined") {
        // TODO: Handle the operator.
      }
    }

    // TODO: Loop until end is reach or itemsPerPage is reached.
    // TODO: Use the cursor when ACCUMULATING ENOUGH items while looping ^.
    // TODO: How do we sort?
    // TODO: Handle existence checks.
    const command = new ScanCommand({
      ExclusiveStartKey: cursor ? marshall(cursor) : undefined,
      TableName: tableName,
      ...selectedFieldParams,
      Select: checkExistence
        ? "COUNT"
        : selectFields && selectFields.length > 0
          ? "SPECIFIC_ATTRIBUTES"
          : "ALL_ATTRIBUTES",
    });
    const {} = await this.dynamoDBClient.send(command);

    // TODO: Return the right results.
    return true;
  };
}
