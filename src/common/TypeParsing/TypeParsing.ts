import { createSourceFile, Node, ScriptTarget, SyntaxKind } from "typescript";
import { convertASTToMap, TypeMap } from "./TypeMapping";
import { TypeInfoMap } from "./TypeInfo";
import { getTypeInfoFromTypeAlias } from "./ParsingUtils/getTypeInfoFromTypeAlias";

/**
 * Extracts type information from TypeScript content.
 */
export const getTypeInfoMapFromTypeScript = (source: string): TypeInfoMap => {
  const typeScriptNode: Node = createSourceFile(
    "x.ts",
    source,
    ScriptTarget.Latest,
    true,
  );
  const typeMap: TypeMap = convertASTToMap(typeScriptNode, {});
  const typeInfoMap: TypeInfoMap = {};

  for (const key in typeMap) {
    const typeAliasDec = typeMap[key];
    const { modifiers } = typeAliasDec;

    let outputTypeInfo = false;

    if (modifiers) {
      modifiers.forEach((modifier) => {
        const { kind } = modifier;

        if (kind === SyntaxKind.ExportKeyword) {
          outputTypeInfo = true;
        }
      });
    }

    if (outputTypeInfo) {
      const typeInfo = getTypeInfoFromTypeAlias(typeAliasDec, typeMap);

      if (typeInfo) {
        typeInfoMap[key] = typeInfo;
      }
    }
  }

  return typeInfoMap;
};
