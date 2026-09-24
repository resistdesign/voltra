import {
  assertDynamoIndexTableKey,
  assertIndexTableConfig,
} from "./IndexTable";
import type { DynamoQueryClient } from "./Types";
import { FullTextDdbBackend } from "./FullTextDdbBackend";
import { createRelationEdgesDdbDependencies } from "./RelationalDdb";
import { StructuredDdbBackend } from "./StructuredDdbBackend";

const stubClient: DynamoQueryClient = {
  batchWriteItem: async () => ({}),
  batchGetItem: async () => ({}),
  getItem: async () => ({}),
  putItem: async () => ({}),
  query: async () => ({}),
};

/**
 * Validate that every DDB backend fails fast when the unified table is missing.
 */
const runIndexingTablesValidationScenario = () => {
  let missingFullTextTableError: string | undefined;
  try {
    new FullTextDdbBackend({
      client: stubClient,
      table: { tableName: "" },
    });
  } catch (error) {
    missingFullTextTableError = (error as Error).message ?? String(error);
  }

  let missingStructuredTableError: string | undefined;
  try {
    new StructuredDdbBackend({
      client: stubClient,
      table: { tableName: "" },
    });
  } catch (error) {
    missingStructuredTableError = (error as Error).message ?? String(error);
  }

  let missingRelationsTableError: string | undefined;
  try {
    createRelationEdgesDdbDependencies({
      client: stubClient,
      table: { tableName: "" },
    });
  } catch (error) {
    missingRelationsTableError = (error as Error).message ?? String(error);
  }

  return {
    missingFullTextTableError,
    missingStructuredTableError,
    missingRelationsTableError,
  };
};

export const runIndexingTablesValidationMissingFullTextTableErrorScenario =
  () => runIndexingTablesValidationScenario().missingFullTextTableError;

export const runIndexingTablesValidationMissingStructuredTableErrorScenario =
  () => runIndexingTablesValidationScenario().missingStructuredTableError;

export const runIndexingTablesValidationMissingRelationsTableErrorScenario =
  () => runIndexingTablesValidationScenario().missingRelationsTableError;

export const runDynamoIndexRejectsOversizedKeyScenario = () => {
  try {
    assertDynamoIndexTableKey({ pk: "p", sk: "x".repeat(1025) });
    return false;
  } catch (_error) {
    return true;
  }
};

export const runIndexingTablesValidationEmptyMaintenanceIndexScenario = () => {
  try {
    assertIndexTableConfig({
      tableName: "Index",
      maintenanceIndexName: "",
    });
    return undefined;
  } catch (error) {
    return (error as Error).message ?? String(error);
  }
};
