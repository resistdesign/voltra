import {
  ArrayTypeNode,
  SyntaxKind,
  TypeNode,
  TypeReferenceNode,
  UnionTypeNode,
} from "typescript";
import { LiteralValue, TypeKeyword } from "../TypeInfo";
import { checkUnionType } from "./checkUnionType";
import { getTypeKeyword } from "./getTypeKeyword";

/**
 * Inspect a TypeScript type node to determine type metadata.
 *
 * @param node - AST type node to inspect.
 * @returns Type metadata including reference, array, keyword, and options.
 */
export const checkType = (
  node: TypeNode,
): {
  typeReference?: string | undefined;
  isArray?: boolean;
  typeKeyword?: TypeKeyword;
  options?: LiteralValue[] | undefined;
} => {
  let typeReference: string | undefined;
  let isArray = false;
  let typeKeyword: TypeKeyword;
  let options: LiteralValue[] | undefined;

  if (node.kind === SyntaxKind.TypeReference) {
    typeReference = (node as TypeReferenceNode).typeName.getText();
    typeKeyword = "string";
  } else if (node.kind === SyntaxKind.ArrayType) {
    isArray = true;
    const elementType = (node as ArrayTypeNode).elementType;
    const {
      typeReference: elementReference,
      isArray: elementIsArray,
      typeKeyword: elementKeyword,
      options: elementOptions,
    } = checkType(elementType);

    typeReference = elementReference;
    isArray = !!elementIsArray;
    typeKeyword = elementKeyword || "string";
    options = elementOptions;
  } else if (node.kind === SyntaxKind.UnionType) {
    const { types: unionTypes } = node as UnionTypeNode;
    const { options: unionOptions, typeKeyword: unionTypeKeyword } =
      checkUnionType(node as UnionTypeNode);

    options = unionOptions;
    typeKeyword = unionTypeKeyword;

    if (!options) {
      typeKeyword = getTypeKeyword(unionTypes[0]);
    }
  } else if (node.kind === SyntaxKind.ParenthesizedType) {
    const {
      typeReference: parenthesizedReference,
      isArray: parenthesizedIsArray,
      typeKeyword: parenthesizedKeyword,
      options: parenthesizedOptions,
    } = checkType((node as any).type);

    typeReference = parenthesizedReference;
    isArray = !!parenthesizedIsArray;
    typeKeyword = parenthesizedKeyword || "string";
    options = parenthesizedOptions;
  } else {
    typeKeyword = getTypeKeyword(node);
  }

  return { typeReference, isArray, typeKeyword, options };
};
