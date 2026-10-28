/**
 * @packageDocumentation
 *
 * DynamoDB-backed data item driver for TypeInfo ORM. Supports CRUD and list
 * operations using scans by default, with optional GSI-backed queries when the
 * first sort field is configured to act as an index name.
 */
import {
  DATA_ITEM_DB_DRIVER_ERRORS,
  DataItemOperationConfig,
  CanonicalWriteCommittedError,
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
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommand,
  ScanCommandInput,
  ScanCommandOutput,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { convertToAttr, marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as UUIDV4 } from "uuid";
import {
  TypeInfoDataItem,
  TypeInfoMap,
  TypeInfoPack,
} from "../../../common/TypeParsing/TypeInfo";
import {
  TypeInfoORMServiceError,
  TypeInfoORMCreateConfig,
  TypeInfoORMReadConfig,
  TypeInfoORMUpdateConfig,
  TypeInfoORMUpdateOperators,
} from "../../../common/TypeInfoORM";
import {
  ComparisonOperators,
  FieldCriterion,
  ListItemsConfig,
  ListItemsResults,
  LogicalOperators,
  SearchCriteria,
} from "../../../common/SearchTypes";
import { getSortedItems } from "../../../common/SearchUtils";
import { SEARCH_VALIDATION_ERRORS } from "../../../common/SearchValidation";
import ConfigTypeInfoMap from "./DynamoDBDataItemDBDriver/ConfigTypeInfoMap.json";
import type { DynamoDBSpecificConfig } from "./DynamoDBDataItemDBDriver/ConfigTypes";
import { DYNAMODB_MARSHALL_OPTIONS } from "./DynamoDBDataItemDBDriver/MarshallOptions";

const rethrowCanonicalWriteError = (error: unknown): never => {
  if (
    (error as { name?: string })?.name === "ConditionalCheckFailedException"
  ) {
    throw new Error(TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT, {
      cause: error,
    });
  }
  throw error;
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

    for (const [criterionIndex, criterion] of fieldCriteria.entries()) {
      const { fieldName, operator, value, valueOptions } = criterion;

      attributeNames[`#${fieldName}`] = fieldName;

      if (operator === ComparisonOperators.IN) {
        const values = valueOptions;

        if (!values || values.length === 0) {
          throw {
            message: SEARCH_VALIDATION_ERRORS.INVALID_VALUE_OPTION,
            operator,
            fieldName,
          };
        }

        const placeholders = values.map((entry, valueIndex) => {
          const placeholder = `:${fieldName}_${criterionIndex}_${valueIndex}`;

          attributeValues[placeholder] = entry;

          return placeholder;
        });

        expressions.push(`#${fieldName} IN (${placeholders.join(", ")})`);

        continue;
      }

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
      attributeValues[`:${fieldName}`] = value;
    }

    output = {
      FilterExpression: expressions.join(
        ` ${DynamoDBLogicalOperatorMappings[logicalOperator]} `,
      ),
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: marshall(
        attributeValues,
        DYNAMODB_MARSHALL_OPTIONS,
      ),
    };
  }

  return output;
};

const buildUpdateExpression = (
  updatedItem: Partial<TypeInfoDataItem>,
  uniquelyIdentifyingFieldName: any,
  updateConfig?: TypeInfoORMUpdateConfig,
) => {
  const setExpressionParts: string[] = [];
  const addExpressionParts: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, any> = {};

  for (const f in updatedItem) {
    const value = updatedItem[f];

    // IMPORTANT: DO NOT use the `uniquelyIdentifyingFieldName`.
    if (f !== uniquelyIdentifyingFieldName && typeof value !== "undefined") {
      const placeholderName = `#${f}`;
      const placeholderValue = `:${f}`;
      const operator = updateConfig?.fieldOperators?.[f];

      attributeNames[placeholderName] = f;
      attributeValues[placeholderValue] = convertToAttr(
        value,
        DYNAMODB_MARSHALL_OPTIONS,
      );

      if (operator === TypeInfoORMUpdateOperators.NUMBER.INCREMENT) {
        addExpressionParts.push(`${placeholderName} ${placeholderValue}`);
        continue;
      }

      if (operator === TypeInfoORMUpdateOperators.NUMBER.DECREMENT) {
        const decrementPlaceholderValue = `:${f}_decrement`;

        addExpressionParts.push(
          `${placeholderName} ${decrementPlaceholderValue}`,
        );
        attributeValues[decrementPlaceholderValue] = convertToAttr(
          -(value as number),
          DYNAMODB_MARSHALL_OPTIONS,
        );
        // Only the negative delta is referenced by ADD. Unused expression
        // values are rejected by DynamoDB, including on guarded updates.
        delete attributeValues[placeholderValue];
        continue;
      }

      setExpressionParts.push(`${placeholderName} = ${placeholderValue}`);
    }
  }

  const expressionParts: string[] = [];

  if (setExpressionParts.length > 0) {
    expressionParts.push(`SET ${setExpressionParts.join(", ")}`);
  }

  if (addExpressionParts.length > 0) {
    expressionParts.push(`ADD ${addExpressionParts.join(", ")}`);
  }

  return {
    UpdateExpression: expressionParts.join(" "),
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
  };
};

const buildSelectedFieldParams = <ItemType extends Record<string, any>>(
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
  ItemType extends Record<string, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> implements DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> {
  protected dynamoDBClient: DynamoDBClient;
  protected specificConfig: DynamoDBSpecificConfig;

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
    const { useFirstSortFieldAsIndexName, ...clientConfig } =
      (dbSpecificConfig ?? {}) as DynamoDBSpecificConfig;

    this.specificConfig = {
      useFirstSortFieldAsIndexName,
    };

    this.dynamoDBClient = new DynamoDBClient(
      clientConfig as DynamoDBClientConfig,
    );
  }

  private notify = async (
    config: DataItemOperationConfig<ItemType> | undefined,
    before: ItemType | undefined,
    after: ItemType | undefined,
  ) => {
    try {
      await config?.coordination?.changed?.(before, after);
    } catch (cause) {
      throw new CanonicalWriteCommittedError(cause);
    }
  };

  private prior = async (id: ItemType[UniquelyIdentifyingFieldName]) => {
    try {
      return (await this.readItem(id, undefined, {
        consistency: "strong",
      })) as ItemType;
    } catch (error: any) {
      if (error?.message === DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND)
        return undefined;
      throw error;
    }
  };

  // Compare full observed values plus schema-field absence. This binds canonical
  // DAC inputs to the atomic write without requiring locks on external writers.
  private snapshotConditions = (
    before: ItemType | undefined,
    fields: string[],
    names: Record<string, string>,
    values: Record<string, AttributeValue>,
  ): string[] => {
    const conditions: string[] = [];
    const keys = before
      ? new Set([...Object.keys(before), ...fields])
      : new Set([String(this.config.uniquelyIdentifyingFieldName)]);
    let i = 0;
    for (const field of keys) {
      while (`#snapshot${i}` in names || `:snapshot${i}` in values) i++;
      const name = `#snapshot${i}`,
        value = `:snapshot${i++}`;
      names[name] = field;
      if (before?.[field] !== undefined) {
        values[value] = convertToAttr(before[field], DYNAMODB_MARSHALL_OPTIONS);
        conditions.push(`${name} = ${value}`);
      } else conditions.push(`attribute_not_exists(${name})`);
    }
    return conditions;
  };

  /**
   * Create an item in the database.
   * @returns Generated identifier for the created item.
   */
  private createCanonicalItem = async (
    /**
     * New item payload without the identifying field.
     */
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
    createConfig?: TypeInfoORMCreateConfig & DataItemOperationConfig<ItemType>,
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
    if (createConfig?.coordination?.exclusive)
      throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
    // Create has no item DAC in the ORM. Direct inspected creates bind snapshots.
    const inspected = createConfig?.coordination?.inspect;
    const before = inspected
      ? await this.prior(newItemId as ItemType[UniquelyIdentifyingFieldName])
      : undefined;
    await inspected?.(before);
    const names: Record<string, string> = {};
    const values: Record<string, AttributeValue> = {};
    const conditions = inspected
      ? this.snapshotConditions(
          before,
          createConfig?.coordination?.guardFields ?? [],
          names,
          values,
        )
      : [];
    if (createConfig?.ifAbsent) {
      names["#createKey"] = String(uniquelyIdentifyingFieldName);
      conditions.push("attribute_not_exists(#createKey)");
    }
    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(cleanNewItemWithId, DYNAMODB_MARSHALL_OPTIONS),
      ReturnValues: "ALL_OLD",
      ...(conditions.length
        ? {
            ConditionExpression: conditions.join(" AND "),
            ExpressionAttributeNames: names,
          }
        : {}),
      ...(Object.keys(values).length
        ? { ExpressionAttributeValues: values }
        : {}),
    });

    try {
      const { Attributes } = await this.dynamoDBClient.send(command);
      await this.notify(
        createConfig,
        Attributes ? (unmarshall(Attributes) as ItemType) : undefined,
        cleanNewItemWithId,
      );
    } catch (error) {
      if (error instanceof CanonicalWriteCommittedError) throw error;
      rethrowCanonicalWriteError(error);
    }

    return newItemId as ItemType[UniquelyIdentifyingFieldName];
  };

  /** Create with overwrite defaults or atomic create-if-absent enforcement. */
  public createItem = async (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
    createConfig?: TypeInfoORMCreateConfig & DataItemOperationConfig<ItemType>,
  ) => {
    return this.createCanonicalItem(newItem, createConfig);
  };

  /**
   * Read an item from the database.
   * @param readConfig Required consistency; canonical reads honor strong consistency.
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
    readConfig?: TypeInfoORMReadConfig & DataItemOperationConfig<ItemType>,
  ): Promise<Partial<ItemType>> => {
    const { tableName, uniquelyIdentifyingFieldName } = this.config;
    const selectedFieldParams = buildSelectedFieldParams(
      readConfig?.coordination ? undefined : selectedFields,
    );
    const command = new GetItemCommand({
      TableName: tableName,
      Key: marshall(
        {
          [uniquelyIdentifyingFieldName]: uniqueIdentifier,
        },
        DYNAMODB_MARSHALL_OPTIONS,
      ),
      ...(readConfig?.consistency === "strong" || readConfig?.coordination
        ? { ConsistentRead: true }
        : {}),
      ...selectedFieldParams,
    });
    const { Item } = await this.dynamoDBClient.send(command);

    const cleanItem = Item ? (unmarshall(Item) as ItemType) : undefined;
    if (!cleanItem && readConfig?.coordination?.exclusive)
      throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
    await readConfig?.coordination?.inspect?.(cleanItem);
    if (!cleanItem) throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
    return selectedFields?.length
      ? (Object.fromEntries(
          selectedFields
            .filter((field) => field in cleanItem)
            .map((field) => [field, cleanItem[field]]),
        ) as Partial<ItemType>)
      : cleanItem;
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
    updateConfig?: TypeInfoORMUpdateConfig & DataItemOperationConfig<ItemType>,
  ): Promise<boolean> => {
    if (updateConfig?.coordination?.exclusive)
      throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
    const before = updateConfig?.coordination
      ? await this.prior(uniqueIdentifier)
      : undefined;
    await updateConfig?.coordination?.inspect?.(before);
    const { tableName, uniquelyIdentifyingFieldName } = this.config;
    const {
      [uniquelyIdentifyingFieldName]: _unusedUniqueIdentifier,
      ...cleanUpdatedItem
    }: ItemType = updatedItem as ItemType;

    if (typeof uniqueIdentifier !== "undefined") {
      const expressions = buildUpdateExpression(
        cleanUpdatedItem,
        uniquelyIdentifyingFieldName,
        updateConfig,
      );
      const names = expressions.ExpressionAttributeNames;
      const values = expressions.ExpressionAttributeValues;
      const conditions = updateConfig?.coordination
        ? this.snapshotConditions(
            before,
            updateConfig.coordination.guardFields ?? Object.keys(updatedItem),
            names,
            values,
          )
        : [];
      if (updateConfig?.preconditions !== undefined) {
        // Allocate aliases outside the update expression namespace, even for
        // field names that look like our own condition aliases.
        const alias = (prefix: string, used: Record<string, unknown>) => {
          let index = 0;
          while (`${prefix}${index}` in used) index++;
          return `${prefix}${index}`;
        };
        const keyName = alias("#guard", names);
        names[keyName] = String(uniquelyIdentifyingFieldName);
        conditions.push(`attribute_exists(${keyName})`);
        for (const [field, expected] of Object.entries(
          updateConfig.preconditions.expected ?? {},
        )) {
          const name = alias("#guard", names);
          const value = alias(":guard", values);
          names[name] = field;
          values[value] = convertToAttr(expected, DYNAMODB_MARSHALL_OPTIONS);
          conditions.push(`${name} = ${value}`);
        }
      }
      const command = new UpdateItemCommand({
        TableName: tableName,
        Key: marshall(
          {
            [uniquelyIdentifyingFieldName]: uniqueIdentifier,
          },
          DYNAMODB_MARSHALL_OPTIONS,
        ),
        ReturnValues: "ALL_NEW",
        ...expressions,
        ...(conditions.length
          ? { ConditionExpression: conditions.join(" AND ") }
          : {}),
      });
      try {
        const { Attributes } = await this.dynamoDBClient.send(command);
        if (Attributes)
          await this.notify(
            updateConfig,
            before,
            unmarshall(Attributes) as ItemType,
          );
        return !!Attributes;
      } catch (error) {
        return rethrowCanonicalWriteError(error);
      }
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
    deleteConfig?: DataItemOperationConfig<ItemType>,
  ): Promise<boolean> => {
    if (deleteConfig?.coordination?.exclusive)
      throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
    const before = deleteConfig?.coordination
      ? await this.prior(uniqueIdentifier)
      : undefined;
    await deleteConfig?.coordination?.inspect?.(before);
    const names: Record<string, string> = {};
    const values: Record<string, AttributeValue> = {};
    const conditions = deleteConfig?.coordination
      ? this.snapshotConditions(
          before,
          deleteConfig.coordination.guardFields ?? [],
          names,
          values,
        )
      : [];
    const { tableName, uniquelyIdentifyingFieldName } = this.config;
    const command = new DeleteItemCommand({
      TableName: tableName,
      Key: marshall(
        {
          [uniquelyIdentifyingFieldName]: uniqueIdentifier,
        },
        DYNAMODB_MARSHALL_OPTIONS,
      ),
      ReturnValues: "ALL_OLD",
      ...(conditions.length
        ? {
            ConditionExpression: conditions.join(" AND "),
            ExpressionAttributeNames: names,
          }
        : {}),
      ...(Object.keys(values).length
        ? { ExpressionAttributeValues: values }
        : {}),
    });
    try {
      const { Attributes } = await this.dynamoDBClient.send(command);
      if (Attributes)
        await this.notify(
          deleteConfig,
          unmarshall(Attributes) as ItemType,
          undefined,
        );
      return !!Attributes;
    } catch (error) {
      return rethrowCanonicalWriteError(error);
    }
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
    const primarySortField = sortFields?.[0];
    const indexName = this.specificConfig.useFirstSortFieldAsIndexName
      ? primarySortField?.field
      : undefined;
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
        structuredCursor = marshall(
          JSON.parse(cursor) as Record<string, any>,
          DYNAMODB_MARSHALL_OPTIONS,
        );
      } catch (error) {
        throw {
          message: DATA_ITEM_DB_DRIVER_ERRORS.INVALID_CURSOR,
          cursor,
        };
      }
    }

    const commandInput = indexName
      ? ({
          ...params,
          IndexName: indexName,
          KeyConditionExpression: FilterExpression,
          ExclusiveStartKey: structuredCursor,
          Limit: itemsPerPage,
          ScanIndexForward: !primarySortField?.reverse,
        } satisfies QueryCommandInput)
      : ({
          ...params,
          ExclusiveStartKey: structuredCursor,
          Limit: itemsPerPage,
        } satisfies ScanCommandInput);
    const command = indexName
      ? new QueryCommand(commandInput)
      : new ScanCommand(commandInput);
    const { Items = [], LastEvaluatedKey } = (await this.dynamoDBClient.send(
      command,
    )) as QueryCommandOutput | ScanCommandOutput;
    const unmarshalledItems = Items.map((item) => unmarshall(item) as ItemType);

    // Query results arrive in GSI order; scans still require in-memory sorting.
    const sortedItems = indexName
      ? unmarshalledItems
      : getSortedItems(sortFields, unmarshalledItems);

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
