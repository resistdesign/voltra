import { InMemoryFileItemDBDriver } from "./InMemoryFileItemDBDriver";
import { ComparisonOperators, LogicalOperators } from "../../../common/SearchTypes";
import type { BaseFileItem } from "./S3FileItemDBDriver";

const buildDriver = () =>
  new InMemoryFileItemDBDriver({
    tableName: "Files",
    uniquelyIdentifyingFieldName: "id",
    dbSpecificConfig: {
      uploadUrlPrefix: "memory://upload/",
      downloadUrlPrefix: "memory://download/",
      now: () => 1700000000000,
    },
  });

export const runInMemoryFileItemDriverScenario = async () => {
  const driver = buildDriver();

  const id1 = await driver.createItem({
    name: "alpha.txt",
    directory: "docs",
    mimeType: "text/plain",
    sizeInBytes: 12,
  });
  const id2 = await driver.createItem({
    name: "beta.txt",
    directory: "docs",
    mimeType: "text/plain",
    sizeInBytes: 24,
  });
  const id3 = await driver.createItem({
    name: "gamma.log",
    directory: "logs",
    mimeType: "text/plain",
    sizeInBytes: 8,
  });

  const readWithUrls = await driver.readItem(id1, ["id", "uploadUrl", "downloadUrl"]);
  await driver.updateItem(id1, { sizeInBytes: 18 } as Partial<BaseFileItem>);
  const afterUpdate = await driver.readItem(id1);

  const filtered = await driver.listItems(
    {
      itemsPerPage: 10,
      sortFields: [{ field: "name" }],
      criteria: {
        logicalOperator: LogicalOperators.AND,
        fieldCriteria: [
          {
            fieldName: "directory",
            operator: ComparisonOperators.EQUALS,
            value: "docs",
          },
        ],
      },
    },
    ["id", "downloadUrl"],
  );

  const page1 = await driver.listItems({
    itemsPerPage: 1,
    sortFields: [{ field: "name" }],
  });
  const page2 = await driver.listItems({
    itemsPerPage: 1,
    sortFields: [{ field: "name" }],
    cursor: page1.cursor,
  });

  const deleteResult = await driver.deleteItem(id2);
  let missingReadError: string | undefined;
  try {
    await driver.readItem(id2);
  } catch (error: any) {
    missingReadError = error?.message ?? String(error);
  }

  return {
    createdIds: [id1, id2, id3],
    readWithUrls,
    afterUpdate: {
      sizeInBytes: afterUpdate.sizeInBytes,
      updatedOn: afterUpdate.updatedOn,
    },
    filteredIds: filtered.items.map((item) => item.id),
    filteredDownloadUrls: filtered.items.map((item) => item.downloadUrl),
    page1Ids: page1.items.map((item) => item.id),
    page2Ids: page2.items.map((item) => item.id),
    deleteResult,
    missingReadError,
  };
};
