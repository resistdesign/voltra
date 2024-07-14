import {
  SyntaxKind,
  TypeLiteralNode,
  TypeNode,
  TypeReferenceNode,
  UnionTypeNode,
} from "typescript";
import { getTypeInfo } from "./getTypeInfo";
import { TypeMap } from "../TypeMapping";
import { getUnionOrIntersectionTypeInfo } from "./getUnionOrIntersectionTypeInfo";
import { getTypeInfoFromFieldFilter } from "./getTypeInfoFromFieldFilter";
import { TypeInfo } from "../TypeInfo";

const getTypeInfoFromTypeLiteral = (type: TypeNode) =>
  getTypeInfo(type as TypeLiteralNode);

const getTypeInfoFromUnionOrIntersectionType = (
  type: TypeNode,
  typeMap: TypeMap,
) => getUnionOrIntersectionTypeInfo(type as UnionTypeNode, typeMap);

const getTypeInfoFromTypeReference = (type: TypeNode, typeMap: TypeMap) => {
  const typeRef = type as TypeReferenceNode;
  const { typeName } = typeRef;
  const typeNameStr = typeName.getText();

  return getTypeInfoFromFieldFilter(typeNameStr, typeRef, typeMap);
};

const ALIAS_TYPE_PROCESSORS: Record<
  string,
  (type: TypeNode, typeMap: TypeMap) => TypeInfo | undefined
> = {
  [SyntaxKind.TypeLiteral]: getTypeInfoFromTypeLiteral,
  [SyntaxKind.UnionType]: getTypeInfoFromUnionOrIntersectionType,
  [SyntaxKind.IntersectionType]: getTypeInfoFromUnionOrIntersectionType,
  [SyntaxKind.TypeReference]: getTypeInfoFromTypeReference,
};

export const getTypeInfoFromAliasType = (
  type: TypeNode,
  typeMap: TypeMap,
): TypeInfo | undefined => {
  const { kind } = type;
  const processor = ALIAS_TYPE_PROCESSORS[kind];
  const typeInfo = processor ? processor(type, typeMap) : undefined;

  return typeInfo;
};
