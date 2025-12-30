import type { ListItemsConfig } from "../../common/SearchTypes";
import type { DataItemDBDriver } from "./drivers/common/Types";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import { executeDriverListItems } from "./ListItemUtils";

type TestItem = {
  id: string;
  name: string;
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

export const runListItemUtilsScenario = async () => {
  const driver = buildDriver() as unknown as DataItemDBDriver<any, any>;

  const id1 = await (driver as InMemoryDataItemDBDriver<TestItem, "id">).createItem({
    name: "Alpha",
    status: "active",
  });
  const id2 = await (driver as InMemoryDataItemDBDriver<TestItem, "id">).createItem({
    name: "Beta",
    status: "archived",
  });
  const id3 = await (driver as InMemoryDataItemDBDriver<TestItem, "id">).createItem({
    name: "Gamma",
    status: "active",
  });

  const config: ListItemsConfig = {
    itemsPerPage: 10,
    sortFields: [{ field: "name" }],
  };

  const noFilter = await executeDriverListItems(driver, config);
  const filtered = await executeDriverListItems(
    driver,
    config,
    (item) => item.status === "active",
  );
  const transformed = await executeDriverListItems(
    driver,
    config,
    undefined,
    (item) => ({ id: item.id, status: item.status }),
  );
  const selectedFields = await executeDriverListItems(
    driver,
    config,
    undefined,
    undefined,
    ["id"],
  );
  const filteredWithSelect = await executeDriverListItems(
    driver,
    config,
    (item) => item.name !== "Beta",
    undefined,
    ["id", "name"],
  );

  return {
    createdIds: [id1, id2, id3],
    noFilterIds: noFilter.items.map((item) => item.id),
    filteredIds: filtered.items.map((item) => item.id),
    transformedItems: transformed.items,
    selectedFieldKeys: selectedFields.items.map((item) => Object.keys(item).sort()),
    filteredWithSelect: filteredWithSelect.items,
  };
};
