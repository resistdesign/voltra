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
      globalSecondaryIndexes: [
        {
          indexName: "RatingIndex",
          keys: {
            rating: "HASH",
            sort: "RANGE",
          },
          projection: "KEYS_ONLY",
        },
      ],
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
    globalSecondaryIndexes: table?.Properties?.GlobalSecondaryIndexes,
  };
};

export const runDatabasePackResourceKeysScenario = async () =>
  (await runDatabasePackScenario()).resourceKeys;

export const runDatabasePackTableNameScenario = async () =>
  (await runDatabasePackScenario()).tableName;

export const runDatabasePackBillingModeScenario = async () =>
  (await runDatabasePackScenario()).billingMode;

export const runDatabasePackAttributeDefinitionsScenario = async () =>
  (await runDatabasePackScenario()).attributeDefinitions;

export const runDatabasePackKeySchemaScenario = async () =>
  (await runDatabasePackScenario()).keySchema;

export const runDatabasePackGlobalSecondaryIndexesScenario = async () =>
  (await runDatabasePackScenario()).globalSecondaryIndexes;
