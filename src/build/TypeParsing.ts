/**
 * @packageDocumentation
 *
 * Parse TypeScript sources into a {@link TypeInfoMap}. Parsing utilities in
 * `ParsingUtils` extract fields, tags, and type details from AST nodes.
 */
import { createSourceFile, Node, ScriptTarget, SyntaxKind } from "typescript";
import { convertASTToMap, TypeMap } from "./TypeMapping";
import { TypeInfoMap } from "../common/TypeParsing/TypeInfo";
import { getTypeInfoFromTypeAlias } from "../common/TypeParsing/ParsingUtils/getTypeInfoFromTypeAlias";
import { getPrimaryFieldForTypeInfo } from "../common/TypeParsing/ParsingUtils/getPrimaryFieldForTypeInfo";

/**
 * Extracts type information from TypeScript content.
 *
 * @category TypeInfo
 *
 * @param source - TypeScript source text to parse.
 * @returns Map of exported type info definitions.
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
        typeInfoMap[key] = {
          ...typeInfo,
          primaryField: getPrimaryFieldForTypeInfo(typeInfo),
        };
      }
    }
  }

  return typeInfoMap;
};
