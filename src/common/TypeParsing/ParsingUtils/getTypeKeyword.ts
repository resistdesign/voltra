import { SyntaxKind, TypeNode } from "typescript";
import { TypeKeyword } from "../TypeInfo";

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
