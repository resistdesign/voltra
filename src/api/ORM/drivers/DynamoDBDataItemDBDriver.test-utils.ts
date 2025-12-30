import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DynamoDBDataItemDBDriver } from "./DynamoDBDataItemDBDriver";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../../../common/SearchTypes";
import { DATA_ITEM_DB_DRIVER_ERRORS } from "./common/Types";

type TestItem = {
  id: string;
  name: string;
  age: number;
  status?: string;
};

const buildDriver = () => {
  let counter = 0;
  const store = new Map<string, TestItem>();
  let lastScanInput: ScanCommand["input"] | undefined;

  const driver = new DynamoDBDataItemDBDriver<TestItem, "id">({
    tableName: "TestItems",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `item-${++counter}`,
    dbSpecificConfig: {},
  });

  const client = (driver as any).dynamoDBClient as {
    send: (command: unknown) => Promise<any>;
  };

  const applyProjection = (
    item: TestItem,
    projectionExpression?: string,
    attributeNames?: Record<string, string>,
  ) => {
    if (!projectionExpression || !attributeNames) {
      return item;
    }

    const fields = projectionExpression
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((placeholder) => attributeNames[placeholder])
      .filter(Boolean);
    const projected: Partial<TestItem> = {};

    fields.forEach((field) => {
      (projected as any)[field] = item[field as keyof TestItem];
    });

    return projected;
  };

  const parseFilterExpression = (
    item: TestItem,
    expression?: string,
    attributeNames?: Record<string, string>,
    attributeValues?: Record<string, any>,
  ) => {
    if (!expression || !attributeNames || !attributeValues) {
      return true;
    }

    const hasOr = expression.includes(" OR ");
    const parts = expression.split(hasOr ? " OR " : " AND ");
    const evaluate = (part: string) => {
      if (part.includes(" >= ")) {
        const [namePlaceholder, valuePlaceholder] = part.split(" >= ");
        const fieldName = attributeNames[namePlaceholder.trim()];
        const value = attributeValues[valuePlaceholder.trim()];
        return (item as any)[fieldName] >= value;
      }

      if (part.includes(" <= ")) {
        const [namePlaceholder, valuePlaceholder] = part.split(" <= ");
        const fieldName = attributeNames[namePlaceholder.trim()];
        const value = attributeValues[valuePlaceholder.trim()];
        return (item as any)[fieldName] <= value;
      }

      if (part.includes(" = ")) {
        const [namePlaceholder, valuePlaceholder] = part.split(" = ");
        const fieldName = attributeNames[namePlaceholder.trim()];
        const value = attributeValues[valuePlaceholder.trim()];
        return (item as any)[fieldName] === value;
      }

      return true;
    };

    return hasOr ? parts.some(evaluate) : parts.every(evaluate);
  };

  client.send = async (command: any) => {
    if (command instanceof PutItemCommand) {
      const item = unmarshall(command.input.Item as any) as TestItem;
      store.set(item.id, item);
      return {};
    }

    if (command instanceof GetItemCommand) {
      const key = unmarshall(command.input.Key as any) as { id: string };
      const item = store.get(key.id);
      if (!item) {
        return {};
      }
      const projected = applyProjection(
        item,
        command.input.ProjectionExpression,
        command.input.ExpressionAttributeNames,
      );
      return { Item: marshall(projected) };
    }

    if (command instanceof UpdateItemCommand) {
      const key = unmarshall(command.input.Key as any) as { id: string };
      const item = store.get(key.id);
      if (!item) {
        return {};
      }
      const updateExpression = command.input.UpdateExpression ?? "";
      const updates = updateExpression.replace(/^SET\s+/i, "").split(",");
      const attributeValues = command.input.ExpressionAttributeValues
        ? unmarshall(command.input.ExpressionAttributeValues as any)
        : {};
      const attributeNames = command.input.ExpressionAttributeNames ?? {};

      updates.forEach((update) => {
        const [namePlaceholder, valuePlaceholder] = update.split("=").map((s) => s.trim());
        const fieldName = attributeNames[namePlaceholder];
        if (!fieldName) {
          return;
        }
        const value = attributeValues[valuePlaceholder];
        (item as any)[fieldName] = value;
      });

      store.set(item.id, item);
      return { Attributes: marshall(item) };
    }

    if (command instanceof DeleteItemCommand) {
      const key = unmarshall(command.input.Key as any) as { id: string };
      const item = store.get(key.id);
      if (!item) {
        return {};
      }
      store.delete(key.id);
      return { Attributes: marshall(item) };
    }

    if (command instanceof ScanCommand) {
      lastScanInput = command.input;
      const attributeValues = command.input.ExpressionAttributeValues
        ? unmarshall(command.input.ExpressionAttributeValues as any)
        : undefined;
      const attributeNames = command.input.ExpressionAttributeNames;
      const projectionExpression = command.input.ProjectionExpression;
      const limit = command.input.Limit ?? Infinity;
      const exclusiveStartKey = command.input.ExclusiveStartKey
        ? (unmarshall(command.input.ExclusiveStartKey as any) as { id: string })
        : undefined;
      const items = Array.from(store.values());
      const startIndex = exclusiveStartKey
        ? items.findIndex((item) => item.id === exclusiveStartKey.id) + 1
        : 0;
      const filtered = items.filter((item) =>
        parseFilterExpression(
          item,
          command.input.FilterExpression,
          attributeNames,
          attributeValues,
        ),
      );
      const page = filtered.slice(startIndex, startIndex + limit);
      const lastItem = page[page.length - 1];
      const lastEvaluatedKey =
        filtered.length > startIndex + page.length && lastItem
          ? marshall({ id: lastItem.id })
          : undefined;

      return {
        Items: page.map((item) =>
          marshall(applyProjection(item, projectionExpression, attributeNames)),
        ),
        LastEvaluatedKey: lastEvaluatedKey,
      };
    }

    return {};
  };

  return {
    driver,
    getLastScanInput: () => lastScanInput,
  };
};

export const runDynamoDBDataItemDriverScenario = async () => {
  const { driver, getLastScanInput } = buildDriver();

  const id1 = await driver.createItem({
    name: "Alpha",
    age: 35,
    status: "active",
  });
  const id2 = await driver.createItem({
    name: "Beta",
    age: 29,
    status: "archived",
  });
  const id3 = await driver.createItem({
    name: "Gamma",
    age: 42,
    status: "active",
  });

  const readSelected = await driver.readItem(id1, ["id", "name"]);
  await driver.updateItem(id1, { name: "Alpha+" });
  const afterUpdate = await driver.readItem(id1);

  const filtered = await driver.listItems({
    itemsPerPage: 10,
    sortFields: [{ field: "age" }],
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "age",
          operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
          value: 30,
        },
        {
          fieldName: "status",
          operator: ComparisonOperators.EQUALS,
          value: "active",
        },
      ],
    },
  });
  const lastScanInput = getLastScanInput();

  const page1 = await driver.listItems({ itemsPerPage: 2 });
  const page2 = await driver.listItems({ itemsPerPage: 2, cursor: page1.cursor });

  const listSelected = await driver.listItems({ itemsPerPage: 3 }, ["id"]);

  const deleteResult = await driver.deleteItem(id2);
  let missingReadError: string | undefined;
  try {
    await driver.readItem(id2);
  } catch (error: any) {
    missingReadError = error?.message ?? String(error);
  }

  let invalidCursorError: string | undefined;
  try {
    await driver.listItems({ itemsPerPage: 2, cursor: "not-json" });
  } catch (error: any) {
    invalidCursorError = error?.message ?? String(error);
  }

  const expressionValues = lastScanInput?.ExpressionAttributeValues
    ? unmarshall(lastScanInput.ExpressionAttributeValues as any)
    : undefined;

  return {
    createdIds: [id1, id2, id3],
    readSelected,
    afterUpdate: {
      name: afterUpdate.name,
      age: afterUpdate.age,
    },
    filteredIds: filtered.items.map((item) => item.id),
    page1Ids: page1.items.map((item) => item.id),
    page2Ids: page2.items.map((item) => item.id),
    listSelectedKeys: listSelected.items.map((item) => Object.keys(item).sort()),
    deleteResult,
    missingReadError,
    invalidCursorError,
    listFilterExpression: lastScanInput?.FilterExpression,
    listFilterAttributeNames: lastScanInput?.ExpressionAttributeNames,
    listFilterAttributeValues: expressionValues,
    missingReadErrorExpected: DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND,
    invalidCursorErrorExpected: DATA_ITEM_DB_DRIVER_ERRORS.INVALID_CURSOR,
  };
};
