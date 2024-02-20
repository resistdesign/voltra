import {
  DynamoDB,
  DynamoDBClientConfig,
  QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { DBServiceItemDriver } from "../../DBServiceTypes";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  Criteria,
  Criterion,
  SearchCriterionLogicalGroupingTypes,
  SearchCriterionTypes,
  SearchOperatorTypes,
} from "../../SearchCriteriaTypes";

export type BaseQueryCommandInput = Pick<
  QueryCommandInput,
  "FilterExpression" | "ExpressionAttributeValues" | "ExpressionAttributeNames"
>;

export type FieldIndexKey = number[];

export const OPERATOR_MAP: Record<SearchOperatorTypes, string> = {
  [SearchOperatorTypes.EQUAL]: "=",
  [SearchOperatorTypes.NOT_EQUAL]: "<>",
  [SearchOperatorTypes.GREATER_THAN]: ">",
  [SearchOperatorTypes.GREATER_THAN_OR_EQUAL]: ">=",
  [SearchOperatorTypes.LESS_THAN]: "<",
  [SearchOperatorTypes.LESS_THAN_OR_EQUAL]: "<=",
  [SearchOperatorTypes.IN]: "IN",
  [SearchOperatorTypes.NOT_IN]: "NOT IN",
  [SearchOperatorTypes.CONTAINS]: "CONTAINS",
  [SearchOperatorTypes.NOT_CONTAINS]: "NOT CONTAINS",
  [SearchOperatorTypes.STARTS_WITH]: "BEGINS_WITH",
  [SearchOperatorTypes.ENDS_WITH]: "ENDS_WITH",
  [SearchOperatorTypes.IS_NULL]: "IS NULL",
  [SearchOperatorTypes.IS_NOT_NULL]: "IS NOT NULL",
  [SearchOperatorTypes.IS_EMPTY]: "IS EMPTY",
  [SearchOperatorTypes.IS_NOT_EMPTY]: "IS NOT EMPTY",
  [SearchOperatorTypes.BETWEEN]: "BETWEEN",
  [SearchOperatorTypes.NOT_BETWEEN]: "NOT BETWEEN",
  [SearchOperatorTypes.EXISTS]: "EXISTS",
  [SearchOperatorTypes.NOT_EXISTS]: "NOT EXISTS",
};

export const getFieldName = (field: string, fieldNamePrefix = ""): string =>
  fieldNamePrefix ? `${fieldNamePrefix}.${field}` : field;

export const convertCriterionToDynamoDBQuery = (
  criterion: Criterion,
  fieldIndexKey: FieldIndexKey = [0],
  fieldNamePrefix = "",
): BaseQueryCommandInput => {
  const { field, operator, value } = criterion;
  const fieldIndexKeyString = fieldIndexKey.join(".");
  const fiName = `#fi${fieldIndexKeyString}`;
  const fiValue = `:fi${fieldIndexKeyString}`;
  const cleanOperator = OPERATOR_MAP[operator];

  return {
    ExpressionAttributeNames: {
      [fiName]: getFieldName(field, fieldNamePrefix),
    },
    ExpressionAttributeValues: marshall({
      [fiValue]: value,
    }),
    FilterExpression: `${fiName} ${cleanOperator} ${fiValue}`,
  };
};

export const convertCriteriaToDynamoDBQuery = (
  criteria: Criteria | undefined = undefined,
  fieldIndexKey: FieldIndexKey = [0],
  fieldNamePrefix = "",
): Partial<BaseQueryCommandInput> => {
  if (criteria) {
    const { type } = criteria;

    if (type === SearchCriterionTypes.CRITERION_GROUP) {
      const {
        logicalGroupingType = SearchCriterionLogicalGroupingTypes.AND,
        criteria: subCriteria = [],
      } = criteria;
      const subQueryCommandInputs = subCriteria.map((subCriterion, index) =>
        convertCriteriaToDynamoDBQuery(
          subCriterion,
          [...fieldIndexKey, index],
          fieldNamePrefix,
        ),
      );
      const { FilterExpression, ...otherProps } = subQueryCommandInputs.reduce(
        (acc, subQueryCommandInput) => {
          return {
            ExpressionAttributeNames: {
              ...acc.ExpressionAttributeNames,
              ...subQueryCommandInput.ExpressionAttributeNames,
            },
            ExpressionAttributeValues: {
              ...acc.ExpressionAttributeValues,
              ...subQueryCommandInput.ExpressionAttributeValues,
            },
            FilterExpression: `${acc.FilterExpression} ${logicalGroupingType} ${subQueryCommandInput.FilterExpression}`,
          };
        },
        {},
      );

      return {
        FilterExpression: `(${FilterExpression})`,
        ...otherProps,
      };
    } else if (type === SearchCriterionTypes.NESTED_CRITERION) {
      const { value, field } = criteria;

      return convertCriteriaToDynamoDBQuery(
        value,
        [...fieldIndexKey, 0],
        getFieldName(field, fieldNamePrefix),
      );
    } else if (type === SearchCriterionTypes.BOOLEAN_CRITERION) {
      const { value } = criteria;

      return {
        FilterExpression: `${!!value}`.toUpperCase(),
        ExpressionAttributeValues: {},
        ExpressionAttributeNames: {},
      };
    } else {
      return convertCriterionToDynamoDBQuery(
        criteria,
        fieldIndexKey,
        fieldNamePrefix,
      );
    }
  } else {
    return {};
  }
};

const getRandomAsciiChar = (): string =>
  Math.random().toString(36).slice(2, 7)[0] || getRandomAsciiChar();
const getRandomString = (lengthRemaining: number = 0): string =>
  lengthRemaining > 0
    ? `${getRandomAsciiChar()}${getRandomString(lengthRemaining - 1)}`
    : "";
const getUUID = (prefix = "") =>
  `${prefix}${getRandomString(8)}-${getRandomString(4)}-${getRandomString(
    4,
  )}-${getRandomString(4)}-${getRandomString(12)}`;
const getMultiUUID = (prefix = "", multiple: number = 1): string =>
  `${prefix}${[...new Array(multiple)].map(() => getUUID()).join("_")}`;

export const getStandardUUID = () =>
  getMultiUUID(`${new Date().getTime()}_`, 8);

export type DynamoDBServiceItemDriverConfig<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  config: DynamoDBClientConfig;
  uniquelyIdentifyingFieldName: UniquelyIdentifyingFieldName;
  tableName: string;
};

/**
 * Use DynamoDB as a {@link DBServiceItemDriver}.
 * */
export const getDynamoDBServiceItemDriver = <
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
>({
  config,
  uniquelyIdentifyingFieldName,
  tableName,
}: DynamoDBServiceItemDriverConfig<
  ItemType,
  UniquelyIdentifyingFieldName
>): DBServiceItemDriver<ItemType, UniquelyIdentifyingFieldName> => {
  const dynamoDB = new DynamoDB(config);
  const driver: DBServiceItemDriver<ItemType, UniquelyIdentifyingFieldName> = {
    createItem: async (newItem) => {
      const { Attributes } = await dynamoDB.putItem({
        TableName: tableName,
        Item: marshall({
          ...newItem,
          [uniquelyIdentifyingFieldName]: getStandardUUID(),
        }) as any,
        ReturnValues: "ALL_NEW",
      });

      return unmarshall(Attributes as any) as ItemType;
    },
    readItem: async (uniqueIdentifier) => {
      const { Item } = await dynamoDB.getItem({
        TableName: tableName,
        ConsistentRead: true,
        Key: marshall({
          [uniquelyIdentifyingFieldName]: uniqueIdentifier,
        }),
      });

      return unmarshall(Item as any) as ItemType;
    },
    updateItem: async (updatedItem, patch = false) => {
      if (patch) {
        const patchFields = Object.keys(updatedItem);
        const setExpressionList = patchFields
          .filter((f) => updatedItem[f] !== null)
          .map((f) => `#${f} = :${f}`);
        const deleteExpressionList = patchFields
          .filter((f) => updatedItem[f] === null)
          .map((f) => `#${f}`);
        const fields = patchFields.reduce(
          (acc, f) => ({ ...acc, [`#${f}`]: f }),
          {},
        );
        const setExpression = setExpressionList.length
          ? `SET ${setExpressionList.join(", ")}`
          : "";
        const deleteExpression = deleteExpressionList.length
          ? `DELETE ${deleteExpressionList.join(", ")}`
          : "";
        const expression = [setExpression, deleteExpression]
          .filter((e) => e)
          .join(" ");

        await dynamoDB.updateItem({
          TableName: tableName,
          Key: marshall({
            [uniquelyIdentifyingFieldName]:
              updatedItem[uniquelyIdentifyingFieldName],
          }),
          UpdateExpression: expression,
          ExpressionAttributeNames: fields,
          ExpressionAttributeValues: patchFields.reduce(
            (acc, f) => ({
              ...acc,
              [`:${f}`]: marshall(updatedItem[f]),
            }),
            {},
          ),
          ReturnValues: "ALL_NEW",
        });

        return driver.readItem(
          updatedItem[
            uniquelyIdentifyingFieldName as UniquelyIdentifyingFieldName
          ] as any,
        );
      } else {
        const { Attributes } = await dynamoDB.putItem({
          TableName: tableName,
          Item: marshall(updatedItem),
          ReturnValues: "ALL_NEW",
        });

        return unmarshall(Attributes as any) as ItemType;
      }
    },
    deleteItem: async (uniqueIdentifier) => {
      const { Attributes } = await dynamoDB.deleteItem({
        TableName: tableName,
        Key: marshall({
          [uniquelyIdentifyingFieldName]: uniqueIdentifier,
        }),
        ReturnValues: "ALL_OLD",
      });

      return unmarshall(Attributes as any) as ItemType;
    },
    listItems: async (config) => {
      const { itemsPerPage = 1, cursor, criteria } = config;

      let results: any[] = [],
        lastResults: any[] = [],
        lastEvaluatedKey: string | undefined = cursor;

      while (results.length < itemsPerPage && lastResults.length > 0) {
        const queryCommandInput: QueryCommandInput = {
          TableName: tableName,
          Limit: itemsPerPage,
          ExclusiveStartKey: lastEvaluatedKey
            ? JSON.parse(lastEvaluatedKey)
            : {},
          ...convertCriteriaToDynamoDBQuery(criteria),
        };
        const { Items, LastEvaluatedKey } =
          await dynamoDB.query(queryCommandInput);

        results = [...results, ...(Items || [])];
        lastResults = Items || [];
        lastEvaluatedKey = JSON.stringify(LastEvaluatedKey);
      }

      return {
        cursor: lastEvaluatedKey,
        items: results.map((r) => unmarshall(r) as ItemType),
      };
    },
  };

  return driver;
};
