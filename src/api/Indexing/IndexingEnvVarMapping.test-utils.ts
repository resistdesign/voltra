import {
  INDEXING_MAINTENANCE_INDEX_ENV_VAR,
  INDEXING_TABLE_ENV_VAR,
  readIndexingTableFromEnv,
} from "../../../site/common/IndexingTable";

/** Validate the demo uses one stable environment variable for all indexes. */
const runIndexingEnvVarMappingScenario = () => {
  const table = readIndexingTableFromEnv({
    [INDEXING_TABLE_ENV_VAR]: "VoltraIndex",
    [INDEXING_MAINTENANCE_INDEX_ENV_VAR]: "KindPkMaintenanceIndex",
  });
  const envVars = [
    INDEXING_TABLE_ENV_VAR,
    INDEXING_MAINTENANCE_INDEX_ENV_VAR,
  ];

  return {
    envVars,
    uniqueCount: new Set(envVars).size,
    totalCount: envVars.length,
    allPrefixed: envVars.every((name) => name.startsWith("INDEXING_")),
    tableName: table.tableName,
    maintenanceIndexName: table.maintenanceIndexName,
  };
};

export const runIndexingEnvVarMappingEnvVarsScenario = () =>
  runIndexingEnvVarMappingScenario().envVars;
export const runIndexingEnvVarMappingUniqueCountScenario = () =>
  runIndexingEnvVarMappingScenario().uniqueCount;
export const runIndexingEnvVarMappingTotalCountScenario = () =>
  runIndexingEnvVarMappingScenario().totalCount;
export const runIndexingEnvVarMappingAllPrefixedScenario = () =>
  runIndexingEnvVarMappingScenario().allPrefixed;
export const runIndexingEnvVarMappingTableNameScenario = () =>
  runIndexingEnvVarMappingScenario().tableName;

export const runIndexingEnvVarMappingMaintenanceIndexScenario = () =>
  runIndexingEnvVarMappingScenario().maintenanceIndexName;
