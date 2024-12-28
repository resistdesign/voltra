import { Project, Type } from "ts-morph";
import Path from "path";

const LEVELS_TO_PROJECT_ROOT = 6;

const project = new Project({
  tsConfigFilePath: Path.join(
    __dirname,
    ...new Array(LEVELS_TO_PROJECT_ROOT).fill(".."),
    "tsconfig.json",
  ),
});

const sourceFile = project.addSourceFileAtPath(
  Path.join(
    __dirname,
    ...new Array(LEVELS_TO_PROJECT_ROOT).fill(".."),
    "node_modules",
    "@aws-sdk",
    "client-dynamodb",
    "dist-types",
    "DynamoDBClient.d.ts",
  ),
);

const outputFile = project.createSourceFile(
  "FlattenedDynamoDBClientConfig.ts",
  "",
  { overwrite: true },
);

// Helper to recursively flatten a type
function flattenType(type: Type): any {
  if (type.isIntersection()) {
    // Flatten all parts of the intersection
    return type.getIntersectionTypes().reduce((acc, subType) => {
      return { ...acc, ...flattenType(subType) };
    }, {});
  } else if (type.isObject()) {
    // Handle object types (e.g., interfaces)
    const properties = type.getProperties();
    const flattened: Record<string, any> = {};

    for (const prop of properties) {
      const propName = prop.getName();
      const propType = prop.getTypeAtLocation(sourceFile);
      flattened[propName] = flattenType(propType);
    }

    return flattened;
  } else if (type.isUnion()) {
    // Handle union types (optional for your use case)
    return type.getUnionTypes().map((unionType) => flattenType(unionType));
  } else {
    // Base case: primitive or other resolved type
    return type.getText();
  }
}

// Locate the DynamoDBClientConfig type and resolve it
const dynamoDBConfigType = sourceFile.getTypeAliasOrThrow(
  "DynamoDBClientConfig",
);
const resolvedType = flattenType(dynamoDBConfigType.getType());

// Write the flattened type to the new file
outputFile.addStatements([
  `export type DynamoDBClientConfig = ${JSON.stringify(resolvedType, null, 2)};`,
]);

// Save the output file
project.saveSync();
