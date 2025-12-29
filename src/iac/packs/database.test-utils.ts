import { SimpleCFT } from "../SimpleCFT";
import { addDatabase } from "./database";

export const runDatabasePackScenario = () => {
  const template = new SimpleCFT()
    .applyPack(addDatabase, {
      tableId: "BooksTable",
      tableName: "books",
      keys: {
        id: "HASH",
        sort: "RANGE",
      },
      attributes: {
        id: "S",
        sort: "S",
        rating: "N",
      },
    })
    .toJSON();

  const resources = template.Resources || {};
  const table = resources.BooksTable as any;

  return {
    resourceKeys: Object.keys(resources).sort(),
    tableName: table?.Properties?.TableName,
    billingMode: table?.Properties?.BillingMode,
    attributeDefinitions: table?.Properties?.AttributeDefinitions,
    keySchema: table?.Properties?.KeySchema,
  };
};
