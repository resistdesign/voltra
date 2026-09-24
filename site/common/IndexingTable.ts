import type { IndexTableConfig } from "../../src/api";

/** Stable environment variable carrying the demo's unified index table name. */
export const INDEXING_TABLE_ENV_VAR = "INDEXING_TABLE";
/** Stable environment variable carrying the demo's maintenance kind GSI name. */
export const INDEXING_MAINTENANCE_INDEX_ENV_VAR =
  "INDEXING_MAINTENANCE_INDEX";

/** Read the demo's unified index table configuration from an environment map. */
export const readIndexingTableFromEnv = (
  env: NodeJS.ProcessEnv,
): IndexTableConfig => ({
  tableName: env[INDEXING_TABLE_ENV_VAR] as string,
  maintenanceIndexName: env[INDEXING_MAINTENANCE_INDEX_ENV_VAR],
});
