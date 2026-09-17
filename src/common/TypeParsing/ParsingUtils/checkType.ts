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
  possibleValuesExhaustive?: boolean;
} => {
  let typeReference: string | undefined;
  let isArray = false;
  let typeKeyword: TypeKeyword;
  let options: LiteralValue[] | undefined;
  let possibleValuesExhaustive: boolean | undefined;

  if (node.kind === SyntaxKind.TypeReference) {
    typeReference = (node as TypeReferenceNode).typeName.getText();
    typeKeyword = "string";
  } else if (node.kind === SyntaxKind.ArrayType) {
    isArray = true;
    const elementType = (node as ArrayTypeNode).elementType;
    const {
      typeReference: elementReference,
      typeKeyword: elementKeyword,
      options: elementOptions,
      possibleValuesExhaustive: elementPossibleValuesExhaustive,
    } = checkType(elementType);

    typeReference = elementReference;
    typeKeyword = elementKeyword || "string";
    options = elementOptions;
    possibleValuesExhaustive = elementPossibleValuesExhaustive;
  } else if (node.kind === SyntaxKind.UnionType) {
    const { types: unionTypes } = node as UnionTypeNode;
    const {
      options: unionOptions,
      typeKeyword: unionTypeKeyword,
      possibleValuesExhaustive: unionPossibleValuesExhaustive,
    } = checkUnionType(node as UnionTypeNode);

    options = unionOptions;
    typeKeyword = unionTypeKeyword || getTypeKeyword(unionTypes[0]);
    possibleValuesExhaustive = unionPossibleValuesExhaustive;
  } else if (node.kind === SyntaxKind.ParenthesizedType) {
    const {
      typeReference: parenthesizedReference,
      isArray: parenthesizedIsArray,
      typeKeyword: parenthesizedKeyword,
      options: parenthesizedOptions,
      possibleValuesExhaustive: parenthesizedPossibleValuesExhaustive,
    } = checkType((node as any).type);

    typeReference = parenthesizedReference;
    isArray = !!parenthesizedIsArray;
    typeKeyword = parenthesizedKeyword || "string";
    options = parenthesizedOptions;
    possibleValuesExhaustive = parenthesizedPossibleValuesExhaustive;
  } else {
    typeKeyword = getTypeKeyword(node);
  }

  return {
    typeReference,
    isArray,
    typeKeyword,
    options,
    possibleValuesExhaustive,
  };
};
