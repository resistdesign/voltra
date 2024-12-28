import { Project, Symbol, Type } from "ts-morph";
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
function generateTypeScriptDefinition(
  type: Type,
  collectedSymbols: Set<Symbol>,
): string {
  if (type.isIntersection()) {
    return type
      .getIntersectionTypes()
      .map((subType) => generateTypeScriptDefinition(subType, collectedSymbols))
      .join(" & ");
  } else if (type.isObject()) {
    const properties = type.getProperties();
    const lines = properties.map((prop) => {
      const name = prop.getName();
      const propType = prop.getTypeAtLocation(sourceFile);
      const optional = prop.isOptional() ? "?" : "";

      // Ensure symbol exists before adding it to the collected set
      const propSymbol = propType.getSymbol();
      if (propSymbol) {
        collectedSymbols.add(propSymbol);
      }

      return `  ${name}${optional}: ${propType.getText()};`;
    });

    return `{\n${lines.join("\n")}\n}`;
  } else if (type.isUnion()) {
    return type
      .getUnionTypes()
      .map((unionType) =>
        generateTypeScriptDefinition(unionType, collectedSymbols),
      )
      .join(" | ");
  } else {
    const symbol = type.getSymbol();
    if (symbol) collectedSymbols.add(symbol);
    return type.getText();
  }
}

// Collect all necessary types from the imported files
const collectedSymbols = new Set<Symbol>();
const dynamoDBConfigInterface = sourceFile.getInterfaceOrThrow(
  "DynamoDBClientConfig",
);
const resolvedType = generateTypeScriptDefinition(
  dynamoDBConfigInterface.getType(),
  collectedSymbols,
);

// Export the resolved types from their original files
collectedSymbols.forEach((symbol) => {
  const declarations = symbol.getDeclarations();
  declarations.forEach((declaration) => {
    const importSource = declaration.getSourceFile().getFilePath();
    if (importSource !== sourceFile.getFilePath()) {
      const importPath = Path.relative(
        Path.dirname(outputFile.getFilePath()),
        importSource,
      ).replace(/\\/g, "/");
      const typeName = symbol.getName();
      outputFile.addImportDeclaration({
        moduleSpecifier: importPath.replace(/\.ts$/, ""),
        namedImports: [typeName],
      });
    }
  });
});

// Write the flattened config type
outputFile.addStatements([
  `export type FlattenedDynamoDBClientConfig = ${resolvedType};`,
]);

// Save the output file
project.saveSync();
