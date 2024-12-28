import { DataItemDBDriver, DataItemDBDriverConfig } from "../Types";
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
import { ListItemsConfig, ListItemsResults } from "../../../../common";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as UUIDV4 } from "uuid";
import {
  removeNonexistentFieldsFromDataItem,
  removeTypeReferenceFieldsFromDataItem,
  removeTypeReferenceFieldsFromSelectedFields,
} from "../../../../common/TypeParsing/Utils";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoField,
} from "../../../../common/TypeParsing/TypeInfo";
import {
  ComparisonOperators,
  FieldCriterion,
  LogicalOperators,
  SearchCriteria,
} from "../../../../common/SearchTypes";
import { getSortedItems } from "../../../../common/SearchUtils";
import FS from "fs";
import Path from "path";
import { getTypeInfoMapFromTypeScript } from "../../../../common/TypeParsing";

/**
 * The errors that can be thrown by the {@link DynamoDBDataItemDBDriver}.
 * */
export const DYNAMODB_DATA_ITEM_DB_DRIVER_ERRORS = {
  INVALID_CURSOR: "INVALID_CURSOR",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  MISSING_UNIQUE_IDENTIFIER: "MISSING_UNIQUE_IDENTIFIER",
  INVALID_CRITERION_VALUE: "INVALID_CRITERION_VALUE",
  SEARCH_COMPARISON_OPERATOR_NOT_SUPPORTED:
    "SEARCH_COMPARISON_OPERATOR_NOT_SUPPORTED",
};

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
  typeName: string,
  typeInfo: TypeInfo,
  fieldCriteria: FieldCriterion[],
  logicalOperator: LogicalOperators,
): {
  FilterExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, any>;
} => {
  const { fields = {} } = typeInfo;
  const expressions: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, any> = {};

  for (const criterion of fieldCriteria) {
    const { fieldName, operator, value, valueOptions } = criterion;
    const { [fieldName]: tIF = {} as TypeInfoField } = fields;
    const { typeReference, possibleValues } = tIF;

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
    if (tIF && typeof typeReference === "undefined") {
      const createExpression =
        DynamoDBOperatorMappings[operator as ComparisonOperators];

      if (!createExpression) {
        throw {
          message:
            DYNAMODB_DATA_ITEM_DB_DRIVER_ERRORS.SEARCH_COMPARISON_OPERATOR_NOT_SUPPORTED,
          operator,
          fieldName,
        };
      }

      expressions.push(createExpression(fieldName));
      attributeNames[`#${fieldName}`] = fieldName;
      attributeValues[`:${fieldName}`] = value;
    }
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
  ItemType extends Record<any, any>,
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

  // TODO: This method REALLY NEEDS to be in a driver config object and not part of the class.
  /**
   * Get the type information for the database driver configuration.
   * */
  public getDBSpecificConfigTypeInfo = (): TypeInfo => {
    const configTypesPath = Path.join(
      __dirname,
      "DynamoDBDataItemDBDriver",
      "ConfigTypes.ts",
    );
    const configTypesTS = FS.readFileSync(configTypesPath, "utf8");
    const { DynamoDBSpecificConfig } =
      getTypeInfoMapFromTypeScript(configTypesTS);

    // TODO: NEED the entire map AND the config `typeName` to get the `TypeInfo`.
    return DynamoDBSpecificConfig;
  };

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
      typeInfo,
      cleanNewItem,
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
    selectedFields?: (keyof ItemType)[],
  ): Promise<Partial<ItemType>> => {
    const { tableName, typeInfo, uniquelyIdentifyingFieldName } = this.config;
    const selectedFieldParams = buildSelectedFieldParams(
      removeTypeReferenceFieldsFromSelectedFields(typeInfo, selectedFields),
    );
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

      return removeTypeReferenceFieldsFromDataItem(
        typeInfo,
        cleanItem,
      ) as ItemType;
    }
  };

  /**
   * Update an item in the database.
   */
  public updateItem = async (
    updatedItem: Partial<ItemType>,
  ): Promise<boolean> => {
    const { typeName, typeInfo, tableName, uniquelyIdentifyingFieldName } =
      this.config;
    const {
      [uniquelyIdentifyingFieldName]: uniqueIdentifier,
      ...cleanUpdatedItem
    }: ItemType = removeTypeReferenceFieldsFromDataItem(
      typeInfo,
      removeNonexistentFieldsFromDataItem(updatedItem),
    ) as any;

    if (typeof uniqueIdentifier !== "undefined") {
      const command = new UpdateItemCommand({
        TableName: tableName,
        Key: marshall({
          [uniquelyIdentifyingFieldName]: uniqueIdentifier,
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
    } else {
      throw {
        message: DYNAMODB_DATA_ITEM_DB_DRIVER_ERRORS.MISSING_UNIQUE_IDENTIFIER,
        typeName,
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
    const { typeName, typeInfo, tableName } = this.config;
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
    } = buildSelectedFieldParams(
      removeTypeReferenceFieldsFromSelectedFields(typeInfo, selectedFields),
    );
    const {
      FilterExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    } = createFilterExpression(
      typeName,
      typeInfo,
      fieldCriteria,
      logicalOperator,
    );
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
    const foundItems: ItemType[] = [];

    let itemsPerPageQuotaMet = false,
      notEnoughItemsToFillPage = false,
      itemExists = false,
      nextCursor: ScanCommandInput["ExclusiveStartKey"] = undefined;

    if (!checkExistence && typeof cursor === "string") {
      try {
        nextCursor = marshall(JSON.parse(cursor));
      } catch (error) {
        throw {
          message: DYNAMODB_DATA_ITEM_DB_DRIVER_ERRORS.INVALID_CURSOR,
          typeName,
          cursor,
        };
      }
    }

    while (
      itemsPerPage > 0 &&
      !itemsPerPageQuotaMet &&
      !notEnoughItemsToFillPage &&
      !itemExists
    ) {
      // IMPORTANT: Loop until end is reach or `itemsPerPage` is reached.
      //   -Use the `cursor` when ACCUMULATING ENOUGH items while looping ^.
      const command = new ScanCommand({
        ...params,
        ExclusiveStartKey: nextCursor,
        // NO REASON to exceed the `itemsPerPage` limit. AND... this makes it so that if there is a `nextCursor`, then THERE IS a `nextCursor`.
        Limit: itemsPerPage - foundItems.length,
      });
      const {
        Items,
        Count = 0,
        LastEvaluatedKey,
      }: ScanCommandOutput = await this.dynamoDBClient.send(command);

      // IMPORTANT: Set the `nextCursor`.
      nextCursor = LastEvaluatedKey;

      // IMPORTANT: Handle existence checks.
      if (checkExistence) {
        itemExists = Count > 0;
        nextCursor = undefined;
      } else if (Items) {
        for (const Item of Items) {
          const unmarshalledItem = unmarshall(Item) as ItemType;

          if (!itemsPerPageQuotaMet) {
            foundItems.push(
              removeTypeReferenceFieldsFromDataItem(
                typeInfo,
                unmarshalledItem,
              ) as ItemType,
            );
            itemsPerPageQuotaMet = foundItems.length == itemsPerPage;

            if (itemsPerPageQuotaMet) {
              break;
            }
          }
        }
      } else {
        notEnoughItemsToFillPage = true;
        nextCursor = undefined;
      }

      // IMPORTANT: DO NOT keep looping if there will never be enough items to fill the page.
      if (
        !LastEvaluatedKey &&
        !(checkExistence ? itemExists : itemsPerPageQuotaMet)
      ) {
        notEnoughItemsToFillPage = true;
      }
    }

    // Sort the items.
    const sortedItems = getSortedItems(sortFields, foundItems);

    return checkExistence
      ? itemExists
      : {
          items: sortedItems as ItemType[],
          cursor: nextCursor
            ? JSON.stringify(unmarshall(nextCursor))
            : undefined,
        };
  };
}

// TODO: Cleaning relational, nonexistent and selected fields SHOULD be done at the `TypeInfoORMService` level.
// TODO: Drivers SHOULD have an API for `new` and a method to return a `TypeInfo(Map)` for its specific config parameters.
// TODO: Error Type SHOULD be defined at the Driver API level.
