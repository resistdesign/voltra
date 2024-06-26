import { ModuleDeclaration, Node, SyntaxKind, TypeAliasDeclaration } from 'typescript';

export type TypeMap = Record<string, TypeAliasDeclaration>;

export const convertASTToMap = (
  node: Node,
  map: Record<string, TypeAliasDeclaration> = {},
  parentName?: string
): TypeMap => {
  node.forEachChild((child) => {
    const { kind: childKind } = child;

    if (childKind === SyntaxKind.ModuleDeclaration) {
      const moduleNode: ModuleDeclaration = child as ModuleDeclaration;
      const { name: moduleName } = moduleNode;
      const textModuleName: string = moduleName.getText();
      const fullModuleName: string = parentName ? `${parentName}.${textModuleName}` : textModuleName;

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
