/**
 * AST mapping helpers for extracting type aliases from TypeScript sources.
 */
import {
  ModuleDeclaration,
  Node,
  SyntaxKind,
  TypeAliasDeclaration,
} from "typescript";

/**
 * A map of type aliases in the TypeScript AST.
 */
export type TypeMap = Record<string, TypeAliasDeclaration>;

/**
 * Converts a TypeScript AST to a map of type aliases.
 *
 * @param node - AST node to traverse.
 * @param map - Accumulator map of type aliases.
 * @param parentName - Parent module name for nested namespaces.
 * @returns Map of type alias declarations keyed by name.
 */
export const convertASTToMap = (
  node: Node,
  map: Record<string, TypeAliasDeclaration> = {},
  parentName?: string,
): TypeMap => {
  node.forEachChild((child) => {
    const { kind: childKind } = child;

    if (childKind === SyntaxKind.ModuleDeclaration) {
      const moduleNode: ModuleDeclaration = child as ModuleDeclaration;
      const { name: moduleName } = moduleNode;
      const textModuleName: string = moduleName.getText();
      const fullModuleName: string = parentName
        ? `${parentName}.${textModuleName}`
        : textModuleName;

      convertASTToMap(moduleNode, map, fullModuleName);
    }

    if (childKind === SyntaxKind.ModuleBlock) {
      convertASTToMap(child, map, parentName);
    }

    if (childKind === SyntaxKind.TypeAliasDeclaration) {
      const typeAliasDec = child as TypeAliasDeclaration;
      const {
        name: { text: typeName },
      } = typeAliasDec;
      const fullTypeName = parentName ? `${parentName}.${typeName}` : typeName;

      map[fullTypeName] = typeAliasDec;
    }
  });

  return map;
};
