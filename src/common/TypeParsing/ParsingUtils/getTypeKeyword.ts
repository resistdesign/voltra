import { SyntaxKind, TypeNode } from "typescript";
import { TypeKeyword } from "../TypeInfo";

/**
 * Resolve a TypeScript type node into a TypeInfo keyword.
 *
 * @param node - Type node to inspect.
 * @returns TypeInfo keyword (string, number, boolean).
 */
export const getTypeKeyword = (node: TypeNode): TypeKeyword => {
  switch (node.kind) {
    case SyntaxKind.StringKeyword:
      return "string";
    case SyntaxKind.NumberKeyword:
      return "number";
    case SyntaxKind.BooleanKeyword:
      return "boolean";
    default:
      return "string";
  }
};
