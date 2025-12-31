/**
 * @packageDocumentation
 *
 * DynamoDB-backed data item driver for TypeInfo ORM. Supports CRUD and scan-based
 * list operations with SearchCriteria filters.
 */
import {
  DATA_ITEM_DB_DRIVER_ERRORS,
  DataItemDBDriver,
  DataItemDBDriverConfig,
  SupportedDataItemDBDriverEntry,
} from "./common/Types";
import {
  AttributeValue,
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
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as UUIDV4 } from "uuid";
import {
  TypeInfoDataItem,
  TypeInfoMap,
  TypeInfoPack,
} from "../../../common/TypeParsing/TypeInfo";
import {
  ComparisonOperators,
  FieldCriterion,
  ListItemsConfig,
  ListItemsResults,
  LogicalOperators,
  SearchCriteria,
} from "../../../common/SearchTypes";
import { getSortedItems } from "../../../common/SearchUtils";
import Path from "path";
import { fileURLToPath } from "url";
import ConfigTypeInfoMap from "./DynamoDBDataItemDBDriver/ConfigTypeInfoMap.json";

const moduleDirname =
  typeof __dirname === "string"
    ? __dirname
    : Path.dirname(fileURLToPath(import.meta.url));

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

type FilterExpressionOutput = {
  /**
   * Filter expression string for DynamoDB scans.
   */
  FilterExpression?: string;
  /**
   * Attribute name mappings used in expressions.
   */
  ExpressionAttributeNames?: Record<string, string>;
  /**
   * Attribute value mappings used in expressions.
   */
  ExpressionAttributeValues?: Record<string, AttributeValue>;
};

const createFilterExpression = (
  fieldCriteria: FieldCriterion[],
  logicalOperator: LogicalOperators,
): FilterExpressionOutput => {
  let output: FilterExpressionOutput = {};

  if (fieldCriteria && fieldCriteria.length > 0) {
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

    output = {
      FilterExpression: expressions.join(
        ` ${DynamoDBLogicalOperatorMappings[logicalOperator]} `,
      ),
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: marshall(attributeValues),
    };
  }

  return output;
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
    typeof (selectedFields ?? false) && Array.isArray(selectedFields)
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
> implements DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> {
  protected dynamoDBClient: DynamoDBClient;

  /**
   * @param config Driver configuration including DynamoDB client settings.
   */
  constructor(
    /**
     * Driver configuration including table name and DynamoDB config.
     */
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
   * @returns Generated identifier for the created item.
   */
  public createItem = async (
    /**
     * New item payload without the identifying field.
     */
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
   * @returns Item payload (partial when selected fields are used).
   */
  public readItem = async (
    /**
     * Unique identifier value for the item.
     */
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    /**
     * Optional fields to select from the item.
     */
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
   * @returns True when an item was updated.
   */
  public updateItem = async (
    /**
     * Unique identifier value for the item.
     */
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    /**
     * Partial update payload for the item.
     */
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
   * @returns True when an item was deleted.
   */
  public deleteItem = async (
    /**
     * Unique identifier value for the item.
     */
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
   * @returns List results with items and cursor.
   */
  public listItems = async (
    /**
     * List configuration and criteria.
     */
    config: ListItemsConfig,
    /**
     * Optional fields to select from each item.
     */
    selectedFields?: (keyof ItemType)[],
  ): Promise<ListItemsResults<ItemType>> => {
    const { tableName } = this.config;
    const {
      itemsPerPage = 10,
      cursor,
      sortFields,
      criteria: {
        logicalOperator = LogicalOperators.AND,
        fieldCriteria = [],
      } = {} as SearchCriteria,
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
    // IMPORTANT: DynamoDB is VERY particular about whether to include
    // properties, AT ALL, based on expressions being used.
    const params: ScanCommandInput = {
      TableName: tableName,
      Select:
        selectedFields && selectedFields.length > 0
          ? "SPECIFIC_ATTRIBUTES"
          : "ALL_ATTRIBUTES",
      ...(ProjectionExpression
        ? {
            ProjectionExpression: ProjectionExpression,
          }
        : {}),
      ...(FilterExpression
        ? {
            FilterExpression,
          }
        : {}),
      ...(FilterExpression
        ? {
            ExpressionAttributeNames: {
              ...selectFieldParamsAttributeNames,
              ...ExpressionAttributeNames,
            },
          }
        : ProjectionExpression
          ? {
              ExpressionAttributeNames: {
                ...selectFieldParamsAttributeNames,
              },
            }
          : {}),
      ...(FilterExpression
        ? {
            ExpressionAttributeValues,
          }
        : {}),
    };
    let structuredCursor: ScanCommandInput["ExclusiveStartKey"] = undefined;

    if (typeof cursor === "string") {
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
    const { Items = [], LastEvaluatedKey }: ScanCommandOutput =
      await this.dynamoDBClient.send(command);
    const unmarshalledItems = Items.map((item) => unmarshall(item) as ItemType);

    // Sort the items.
    const sortedItems = getSortedItems(sortFields, unmarshalledItems);

    return {
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
    /**
     * @param config Driver configuration.
     * @returns DynamoDB-backed driver instance.
     */
    factory: <
      ItemType extends Record<any, any>,
      UniquelyIdentifyingFieldName extends keyof ItemType,
    >(
      config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
    ): DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> => {
      return new DynamoDBDataItemDBDriver(config);
    },
    /**
     * @returns Type info pack for the DynamoDB-specific config.
     */
    getDBSpecificConfigTypeInfo: (): TypeInfoPack => {
      return {
        entryTypeName: "DynamoDBSpecificConfig",
        typeInfoMap: ConfigTypeInfoMap as TypeInfoMap,
      };
    },
  };
