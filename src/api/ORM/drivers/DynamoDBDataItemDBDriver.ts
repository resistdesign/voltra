import {
  DATA_ITEM_DB_DRIVER_ERRORS,
  DataItemDBDriver,
  DataItemDBDriverConfig,
  SupportedDataItemDBDriverEntry,
} from "./Types";
import {
  DeleteItemCommand,
  DynamoDBClient,
  DynamoDBClientConfig,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  ScanCommandInput,
  ScanCommandOutput,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { ListItemsConfig, ListItemsResults } from "../../../common";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as UUIDV4 } from "uuid";
import {
  TypeInfoDataItem,
  TypeInfoPack,
} from "../../../common/TypeParsing/TypeInfo";
import {
  ComparisonOperators,
  FieldCriterion,
  LogicalOperators,
  SearchCriteria,
} from "../../../common/SearchTypes";
import { getSortedItems } from "../../../common/SearchUtils";
import FS from "fs";
import Path from "path";
import { getTypeInfoMapFromTypeScript } from "../../../common/TypeParsing";

const DynamoDBOperatorMappings: Partial<
  Record<ComparisonOperators, (fieldName: string) => string>
> = {
  [ComparisonOperators.EQUALS]: (fieldName) => `#${fieldName} = :${fieldName}`,
  [ComparisonOperators.NOT_EQUALS]: (fieldName) =>
    `#${fieldName} <> :${fieldName}`,
  [ComparisonOperators.GREATER_THAN]: (fieldName) =>
    `#${fieldName} > :${fieldName}`,
  [ComparisonOperators.GREATER_THAN_OR_EQUAL]: (fieldName) =>
    `#${fieldName} >= :${fieldName}`,
  [ComparisonOperators.LESS_THAN]: (fieldName) =>
    `#${fieldName} < :${fieldName}`,
  [ComparisonOperators.LESS_THAN_OR_EQUAL]: (fieldName) =>
    `#${fieldName} <= :${fieldName}`,
  [ComparisonOperators.IN]: (fieldName) => `#${fieldName} IN (:${fieldName})`,
  [ComparisonOperators.LIKE]: (fieldName) =>
    `contains(#${fieldName}, :${fieldName})`,
  [ComparisonOperators.EXISTS]: (fieldName) =>
    `attribute_exists(#${fieldName})`,
  [ComparisonOperators.NOT_EXISTS]: (fieldName) =>
    `attribute_not_exists(#${fieldName})`,
  [ComparisonOperators.IS_EMPTY]: (fieldName) => `size(#${fieldName}) = 0`,
  [ComparisonOperators.IS_NOT_EMPTY]: (fieldName) => `size(#${fieldName}) > 0`,
  [ComparisonOperators.BETWEEN]: (fieldName) =>
    `#${fieldName} BETWEEN :${fieldName}_start AND :${fieldName}_end`,
  [ComparisonOperators.CONTAINS]: (fieldName) =>
    `contains(#${fieldName}, :${fieldName})`,
  [ComparisonOperators.STARTS_WITH]: (fieldName) =>
    `begins_with(#${fieldName}, :${fieldName})`,
};

const DynamoDBLogicalOperatorMappings: Record<LogicalOperators, string> = {
  [LogicalOperators.AND]: "AND",
  [LogicalOperators.OR]: "OR",
};

const createFilterExpression = (
  fieldCriteria: FieldCriterion[],
  logicalOperator: LogicalOperators,
): {
  FilterExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, any>;
} => {
  const expressions: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, any> = {};

  for (const criterion of fieldCriteria) {
    const { fieldName, operator, value } = criterion;
    const createExpression =
      DynamoDBOperatorMappings[operator as ComparisonOperators];

    if (!createExpression) {
      throw {
        message:
          DATA_ITEM_DB_DRIVER_ERRORS.SEARCH_COMPARISON_OPERATOR_NOT_SUPPORTED,
        operator,
        fieldName,
      };
    }

    expressions.push(createExpression(fieldName));
    attributeNames[`#${fieldName}`] = fieldName;
    attributeValues[`:${fieldName}`] = value;
  }

  return {
    FilterExpression: expressions.join(
      ` ${DynamoDBLogicalOperatorMappings[logicalOperator]} `,
    ),
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
  };
};

const buildUpdateExpression = (
  updatedItem: Partial<TypeInfoDataItem>,
  uniquelyIdentifyingFieldName: any,
) => {
  const updateExpressionParts: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, any> = {};

  for (const f in updatedItem) {
    const value = updatedItem[f];

    // IMPORTANT: DO NOT use the `uniquelyIdentifyingFieldName`.
    if (f !== uniquelyIdentifyingFieldName && typeof value !== "undefined") {
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
  selectedFields?: (keyof ItemType)[],
) => {
  const selectedFieldParams =
    typeof selectedFields !== "undefined"
      ? {
          ExpressionAttributeNames: selectedFields.reduce(
            (acc: Record<string, string>, field) => {
              const fieldAsString = String(field);

              acc[`#${fieldAsString}`] = fieldAsString;

              return acc;
            },
            {} as Record<string, string>,
          ) as Record<string, string>,
          ProjectionExpression: selectedFields
            .map((field) => `#${String(field)}`)
            .join(", "),
        }
      : {};

  return selectedFieldParams;
};

/**
 * A {@link DataItemDBDriver} that uses DynamoDB as its database.
 * */
export class DynamoDBDataItemDBDriver<
  ItemType extends TypeInfoDataItem,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> implements DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>
{
  protected dynamoDBClient: DynamoDBClient;

  constructor(
    protected config: DataItemDBDriverConfig<
      ItemType,
      UniquelyIdentifyingFieldName
    >,
  ) {
    const { dbSpecificConfig } = config;

    this.dynamoDBClient = new DynamoDBClient(
      dbSpecificConfig as DynamoDBClientConfig,
    );
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
    const newItemId = generateUniqueIdentifier(newItem as ItemType);
    const cleanNewItemWithId: ItemType = {
      ...newItem,
      [uniquelyIdentifyingFieldName]: newItemId,
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
    selectedFields?: (keyof ItemType)[],
  ): Promise<Partial<ItemType>> => {
    const { tableName, uniquelyIdentifyingFieldName } = this.config;
    const selectedFieldParams = buildSelectedFieldParams(selectedFields);
    const command = new GetItemCommand({
      TableName: tableName,
      Key: marshall({
        [uniquelyIdentifyingFieldName]: uniqueIdentifier,
      }),
      ...selectedFieldParams,
    });
    const { Item } = await this.dynamoDBClient.send(command);

    if (typeof Item === "undefined") {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
    } else {
      const cleanItem = unmarshall(Item) as ItemType;

      return cleanItem;
    }
  };

  /**
   * Update an item in the database.
   */
  public updateItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    updatedItem: Partial<ItemType>,
  ): Promise<boolean> => {
    const { tableName, uniquelyIdentifyingFieldName } = this.config;
    const {
      [uniquelyIdentifyingFieldName]: _unusedUniqueIdentifier,
      ...cleanUpdatedItem
    }: ItemType = updatedItem as ItemType;

    if (typeof uniqueIdentifier !== "undefined") {
      const command = new UpdateItemCommand({
        TableName: tableName,
        Key: marshall({
          [uniquelyIdentifyingFieldName]: uniqueIdentifier,
        }),
        ReturnValues: "ALL_NEW",
        ...buildUpdateExpression(
          cleanUpdatedItem,
          uniquelyIdentifyingFieldName,
        ),
      });
      const { Attributes } = await this.dynamoDBClient.send(command);

      return !!Attributes;
    } else {
      throw {
        message: DATA_ITEM_DB_DRIVER_ERRORS.MISSING_UNIQUE_IDENTIFIER,
        uniquelyIdentifyingFieldName,
      };
    }
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
    selectedFields?: (keyof ItemType)[],
  ): Promise<boolean | ListItemsResults<ItemType>> => {
    const { tableName } = this.config;
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
    const {
      ProjectionExpression,
      ExpressionAttributeNames: selectFieldParamsAttributeNames,
    } = buildSelectedFieldParams(selectedFields);
    const {
      FilterExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    } = createFilterExpression(fieldCriteria, logicalOperator);
    const params: ScanCommandInput = {
      TableName: tableName,
      Select: checkExistence
        ? "COUNT"
        : selectedFields && selectedFields.length > 0
          ? "SPECIFIC_ATTRIBUTES"
          : "ALL_ATTRIBUTES",
      ProjectionExpression: checkExistence ? undefined : ProjectionExpression,
      FilterExpression,
      ExpressionAttributeNames: {
        ...selectFieldParamsAttributeNames,
        ...ExpressionAttributeNames,
      },
      ExpressionAttributeValues,
    };
    let structuredCursor: ScanCommandInput["ExclusiveStartKey"] = undefined;

    if (!checkExistence && typeof cursor === "string") {
      try {
        structuredCursor = marshall(JSON.parse(cursor));
      } catch (error) {
        throw {
          message: DATA_ITEM_DB_DRIVER_ERRORS.INVALID_CURSOR,
          cursor,
        };
      }
    }

    const command = new ScanCommand({
      ...params,
      ExclusiveStartKey: structuredCursor,
      Limit: itemsPerPage,
    });
    const {
      Items = [],
      Count = 0,
      LastEvaluatedKey,
    }: ScanCommandOutput = await this.dynamoDBClient.send(command);
    const unmarshalledItems = Items.map((item) => unmarshall(item) as ItemType);

    // Sort the items.
    const sortedItems = getSortedItems(sortFields, unmarshalledItems);

    return checkExistence
      ? Count > 0
      : {
          items: sortedItems as ItemType[],
          cursor: LastEvaluatedKey
            ? JSON.stringify(unmarshall(LastEvaluatedKey))
            : undefined,
        };
  };
}

/**
 * The supported DB driver entry for the DynamoDB {@link DataItemDBDriver}.
 * */
export const DynamoDBSupportedDataItemDBDriverEntry: SupportedDataItemDBDriverEntry =
  {
    factory: <
      ItemType extends Record<any, any>,
      UniquelyIdentifyingFieldName extends keyof ItemType,
    >(
      config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
    ): DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> => {
      return new DynamoDBDataItemDBDriver(config);
    },
    getDBSpecificConfigTypeInfo: (): TypeInfoPack => {
      const configTypesPath = Path.join(
        __dirname,
        "DynamoDBDataItemDBDriver",
        "ConfigTypes.ts",
      );
      const configTypesTS = FS.readFileSync(configTypesPath, "utf8");
      const typeInfoMap = getTypeInfoMapFromTypeScript(configTypesTS);

      return {
        entryTypeName: "DynamoDBSpecificConfig",
        typeInfoMap,
      };
    },
  };
