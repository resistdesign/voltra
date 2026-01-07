import { indexingTableEnvVars } from "../../../site/common/IndexingTableNames";

export const runIndexingEnvVarMappingScenario = () => {
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
