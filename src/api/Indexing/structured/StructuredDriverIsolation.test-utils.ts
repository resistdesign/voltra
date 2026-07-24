import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const readSibling = (name: string): string =>
  readFileSync(new URL(name, import.meta.url), "utf8");

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));

const listProductionSources = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      return listProductionSources(path);
    }
    return entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test-utils.ts") &&
      !entry.name.endsWith(".spec.ts")
      ? [path]
      : [];
  });

const productionSources = listProductionSources(sourceRoot);
const importStatements = (source: string): string =>
  Array.from(source.matchAll(/^import[\s\S]*?from\s+["'][^"']+["'];/gm))
    .map(([statement]) => statement)
    .join("\n");

/**
 * Guard the production driver boundary at the source level.
 *
 * Test harnesses may compose both implementations, but production in-memory
 * code must not reference Dynamo-named code and production Dynamo code must not
 * reference in-memory implementations.
 */
export const runStructuredDriverIsolationScenario = () => {
  const memorySource = [
    readSibling("./StructuredInMemoryBackend.ts"),
    readSibling("./StructuredInMemoryIndex.ts"),
  ].join("\n");
  const dynamoSource = readSibling("./StructuredDdbBackend.ts");
  const publicIndexSource = readFileSync(
    new URL("../index.ts", import.meta.url),
    "utf8",
  );
  const memoryDriverSources = productionSources
    .filter((path) => /(?:InMemory|MemoryBackend)\.ts$/.test(path))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  const dynamoDriverImports = productionSources
    .filter((path) => /(?:Ddb|Dynamo)[^/]*\.ts$/.test(path))
    .map((path) => importStatements(readFileSync(path, "utf8")))
    .join("\n");

  return {
    memoryHasNoDynamoNames: !/\b(?:Dynamo|Ddb)|\/ddb\//.test(memorySource),
    dynamoHasNoInMemoryDependency: !/StructuredInMemory|\/InMemory/.test(
      dynamoSource,
    ),
    allMemoryDriversHaveNoDynamoNames: !/\b(?:Dynamo|Ddb)|\/ddb\//.test(
      memoryDriverSources,
    ),
    allDynamoDriversHaveNoInMemoryImports: !/(?:InMemory|MemoryBackend)/.test(
      dynamoDriverImports,
    ),
    fakeClientIsNotPublic: !/InMemoryDynamoQueryClient/.test(publicIndexSource),
  };
};
