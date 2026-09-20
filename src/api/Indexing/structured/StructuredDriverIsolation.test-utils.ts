import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const indexingRoot = fileURLToPath(new URL("../", import.meta.url));
const isolationTestPath = fileURLToPath(import.meta.url);

const listGenericSources = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      return listGenericSources(path);
    }
    return entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".d.ts") &&
      path !== isolationTestPath
      ? [path]
      : [];
  });

const genericSources = listGenericSources(indexingRoot);
const genericText = genericSources
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

const importStatements = genericSources
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
 * under driver folders. This includes test utilities: driver-aware integration
 * suites belong under drivers, not under generic Indexing.
 */
export const runStructuredDriverIsolationScenario = () => {
  const relativePaths = genericSources.map((path) =>
    path.slice(indexingRoot.length + 1),
  );

  const findMatchingPaths = (pattern: RegExp): string[] =>
    genericSources
      .filter((path) => pattern.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(indexingRoot.length + 1));

  return {
    storageSpecificFileNames: relativePaths.filter((path) =>
      /(?:Ddb|Dynamo|S3|InMemory)/.test(path),
    ),
    driverImports: findMatchingPaths(/(?:\/drivers\/|ORM\/drivers)/),
    storageSdkImports: findMatchingPaths(/@aws-sdk|client-dynamodb|client-s3/),
    dynamoContracts: findMatchingPaths(
      /\b(?:DynamoDB|DynamoQueryClient|DynamoScanClient|ConsistentRead|ScanCommand|QueryCommand)\b/,
    ),
    s3Contracts: findMatchingPaths(
      /\b(?:S3Client|GetObjectCommand|PutObjectCommand|ListObjectsV2Command)\b/,
    ),
  };
};
