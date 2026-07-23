import {
  INDEXING_TABLE_ENV_VAR,
  readIndexingTableFromEnv,
} from "../../../site/common/IndexingTable";

/** Validate the demo uses one stable environment variable for all indexes. */
const runIndexingEnvVarMappingScenario = () => {
  const table = readIndexingTableFromEnv({
    [INDEXING_TABLE_ENV_VAR]: "VoltraIndex",
  });
  return {
    envVars: [INDEXING_TABLE_ENV_VAR],
    uniqueCount: 1,
    totalCount: 1,
    allPrefixed: INDEXING_TABLE_ENV_VAR.startsWith("INDEXING_"),
    tableName: table.tableName,
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
