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

// Helper to generate TypeScript type definitions
function generateTypeScriptDefinition(type: Type): string {
  if (type.isIntersection()) {
    // Flatten all parts of the intersection
    return type
      .getIntersectionTypes()
      .map((subType) => generateTypeScriptDefinition(subType))
      .join(" & ");
  } else if (type.isObject()) {
    // Handle object types (e.g., interfaces)
    const properties = type.getProperties();
    const lines = properties.map((prop) => {
      const name = prop.getName();
      const propType = prop.getTypeAtLocation(sourceFile).getText();
      const optional = prop.isOptional() ? "?" : "";
      return `  ${name}${optional}: ${propType};`;
    });

    return `{\n${lines.join("\n")}\n}`;
  } else if (type.isUnion()) {
    // Handle union types
    return type
      .getUnionTypes()
      .map((unionType) => generateTypeScriptDefinition(unionType))
      .join(" | ");
  } else {
    // Base case: primitive or other resolved type
    return type.getText();
  }
}

// Locate the DynamoDBClientConfig interface and resolve it
const dynamoDBConfigInterface = sourceFile.getInterfaceOrThrow(
  "DynamoDBClientConfig",
);
const resolvedType = generateTypeScriptDefinition(
  dynamoDBConfigInterface.getType(),
);

// Write the resolved type to a TypeScript file
outputFile.addStatements([
  `export type FlattenedDynamoDBClientConfig = ${resolvedType};`,
]);

// Save the output file
project.saveSync();
