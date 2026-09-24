import {
  VOLTRA_INDEX_MAINTENANCE_INDEX_NAME,
  VOLTRA_INDEX_TABLE_KIND_ATTRIBUTE,
  VOLTRA_INDEX_TABLE_PARTITION_KEY,
  VOLTRA_INDEX_TABLE_SORT_KEY,
} from "../../common/IndexingInfrastructure";
import { SimpleCFT } from "../SimpleCFT";
import { addIndexDatabase } from "./index-database";

const runIndexDatabasePackScenario = () => {
  const template = new SimpleCFT()
    .applyPack(addIndexDatabase, {
      tableId: "IndexingTable",
      tableName: "voltra-index",
    })
    .toJSON();
  const table = template.Resources?.IndexingTable as any;

  return {
    tableName: table?.Properties?.TableName,
    billingMode: table?.Properties?.BillingMode,
    attributeDefinitions: table?.Properties?.AttributeDefinitions,
    keySchema: table?.Properties?.KeySchema,
    globalSecondaryIndexes: table?.Properties?.GlobalSecondaryIndexes,
  };
};

export const runIndexDatabasePackTableNameScenario = () =>
  runIndexDatabasePackScenario().tableName;

export const runIndexDatabasePackBillingModeScenario = () =>
  runIndexDatabasePackScenario().billingMode;

export const runIndexDatabasePackAttributesScenario = () =>
  runIndexDatabasePackScenario().attributeDefinitions;

export const runIndexDatabasePackKeysScenario = () =>
  runIndexDatabasePackScenario().keySchema;

export const runIndexDatabasePackMaintenanceIndexScenario = () =>
  runIndexDatabasePackScenario().globalSecondaryIndexes;

export const runIndexDatabasePackContractScenario = () => ({
  partitionKey: VOLTRA_INDEX_TABLE_PARTITION_KEY,
  sortKey: VOLTRA_INDEX_TABLE_SORT_KEY,
  kindAttribute: VOLTRA_INDEX_TABLE_KIND_ATTRIBUTE,
  maintenanceIndexName: VOLTRA_INDEX_MAINTENANCE_INDEX_NAME,
});
