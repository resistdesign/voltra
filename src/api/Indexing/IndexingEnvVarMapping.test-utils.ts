import { indexingTableEnvVars } from "../../../site/common/IndexingTableNames";

/**
 * Validate the demo indexing env var naming scheme is stable and unique.
 */
const runIndexingEnvVarMappingScenario = () => {
  const envVars = [
    ...Object.values(indexingTableEnvVars.fullText),
    ...Object.values(indexingTableEnvVars.structured),
    ...Object.values(indexingTableEnvVars.relations),
  ].sort();

  const uniqueEnvVars = new Set(envVars);
  const allPrefixed = envVars.every((name) => name.startsWith("INDEXING_"));

  return {
    envVars,
    uniqueCount: uniqueEnvVars.size,
    totalCount: envVars.length,
    allPrefixed,
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
