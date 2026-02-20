import { InMemoryDataItemDBDriver } from "./InMemoryDataItemDBDriver";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../../../common/SearchTypes";

type TestItem = {
  id: string;
  name: string;
  age: number;
  tags?: string[];
  status?: string;
};

const buildDriver = () => {
  let counter = 0;

  return new InMemoryDataItemDBDriver<TestItem, "id">({
    tableName: "TestItems",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `item-${++counter}`,
  });
};

const runInMemoryDataItemDriverScenario = async () => {
  const driver = buildDriver();

  const id1 = await driver.createItem({
    name: "Alpha",
    age: 35,
    tags: ["a", "b"],
    status: "active",
  });
  const id2 = await driver.createItem({
    name: "Beta",
    age: 29,
    tags: ["b"],
    status: "archived",
  });
  const id3 = await driver.createItem({
    name: "Gamma",
    age: 42,
    tags: ["c", "a"],
    status: "active",
  });

  const readSelected = await driver.readItem(id1, ["id", "name"]);
  await driver.updateItem(id1, { name: "Alpha+", tags: undefined });
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

  const page1 = await driver.listItems({
    itemsPerPage: 2,
    sortFields: [{ field: "age" }],
  });
  const page2 = await driver.listItems({
    itemsPerPage: 2,
    sortFields: [{ field: "age" }],
    cursor: page1.cursor,
  });

  const listSelected = await driver.listItems(
    { itemsPerPage: 3, sortFields: [{ field: "age" }] },
    ["id"],
  );

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

  return {
    createdIds: [id1, id2, id3],
    readSelected,
    afterUpdate: {
      name: afterUpdate.name,
      tags: afterUpdate.tags,
    },
    filteredIds: filtered.items.map((item) => item.id),
    page1Ids: page1.items.map((item) => item.id),
    page2Ids: page2.items.map((item) => item.id),
    listSelectedKeys: listSelected.items.map((item) =>
      Object.keys(item).sort(),
    ),
    deleteResult,
    missingReadError,
    invalidCursorError,
  };
};

export const runInMemoryDataItemDriverCreatedIdsScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).createdIds;

export const runInMemoryDataItemDriverReadSelectedScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).readSelected;

export const runInMemoryDataItemDriverAfterUpdateScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).afterUpdate;

export const runInMemoryDataItemDriverFilteredIdsScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).filteredIds;

export const runInMemoryDataItemDriverPage1IdsScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).page1Ids;

export const runInMemoryDataItemDriverPage2IdsScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).page2Ids;

export const runInMemoryDataItemDriverListSelectedKeysScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).listSelectedKeys;

export const runInMemoryDataItemDriverDeleteResultScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).deleteResult;

export const runInMemoryDataItemDriverMissingReadErrorScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).missingReadError;

export const runInMemoryDataItemDriverInvalidCursorErrorScenario = async () =>
  (await runInMemoryDataItemDriverScenario()).invalidCursorError;
