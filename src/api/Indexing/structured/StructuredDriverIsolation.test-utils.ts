import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const indexingRoot = fileURLToPath(new URL("../", import.meta.url));

const listProductionSources = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      return listProductionSources(path);
    }
    return entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test-utils.ts") &&
      !entry.name.endsWith(".spec.ts") &&
      !entry.name.endsWith(".d.ts")
      ? [path]
      : [];
  });

const productionSources = listProductionSources(indexingRoot);
const productionText = productionSources
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

const importStatements = productionSources
  .flatMap((path) =>
    Array.from(
      readFileSync(path, "utf8").matchAll(
        /^import[\s\S]*?from\s+["']([^"']+)["'];/gm,
      ),
      (match) => match[1],
    ),
  )
  .join("\n");

/**
 * Guard Voltra's core storage-driver isolation objective.
 *
 * Generic Indexing owns semantic behavior only. Concrete storage technology,
 * SDKs, adapters, persistence implementations, and driver imports must remain
 * under driver folders.
 */
export const runStructuredDriverIsolationScenario = () => {
  const relativePaths = productionSources.map((path) =>
    path.slice(indexingRoot.length + 1),
  );

  return {
    genericFileNamesAreStorageNeutral: relativePaths.every(
      (path) => !/(?:Ddb|Dynamo|S3|InMemory)/.test(path),
    ),
    genericImportsDoNotReferenceDrivers:
      !/(?:\/drivers\/|ORM\/drivers)/.test(importStatements),
    genericImportsDoNotReferenceStorageSDKs:
      !/@aws-sdk|client-dynamodb|client-s3/.test(importStatements),
    genericSourceHasNoDynamoContracts:
      !/\b(?:DynamoDB|DynamoQueryClient|DynamoScanClient|ConsistentRead|ScanCommand|QueryCommand)\b/.test(
        productionText,
      ),
    genericSourceHasNoS3Contracts:
      !/\b(?:S3Client|GetObjectCommand|PutObjectCommand|ListObjectsV2Command)\b/.test(
        productionText,
      ),
  };
};
