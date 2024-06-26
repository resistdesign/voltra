import {
  IntersectionTypeNode,
  SyntaxKind,
  TypeLiteralNode,
  TypeReferenceNode,
  UnionTypeNode,
} from "typescript";
import { TypeMap } from "../TypeMapping";
import { TypeInfo } from "../TypeInfo";
import { getTypeInfoFromTypeAlias } from "./getTypeInfoFromTypeAlias";
import { getTypeInfo } from "./getTypeInfo";

export const getUnionOrIntersectionTypeInfo = (
  unionType: UnionTypeNode | IntersectionTypeNode,
  typeMap: TypeMap,
): TypeInfo | undefined => {
  const { kind, types } = unionType;
  const isUnion = kind === SyntaxKind.UnionType;

  let typeInfo: TypeInfo | undefined;

  for (const t of types) {
    const { kind } = t;

    let nextTypeInfo: TypeInfo | undefined;

    if (kind === SyntaxKind.TypeReference) {
      const { typeName } = t as TypeReferenceNode;
      const refNode = typeMap[typeName.getText()];

      if (refNode) {
        nextTypeInfo = getTypeInfoFromTypeAlias(refNode, typeMap);
      }
    } else if (kind === SyntaxKind.TypeLiteral) {
      nextTypeInfo = getTypeInfo(t as TypeLiteralNode);
    }

    if (nextTypeInfo) {
      const {
        fields: existingFields = {},
        unionFieldSets: existingFieldSets = [],
      }: Partial<TypeInfo> = typeInfo || {};
      const { fields: nextFields, unionFieldSets: nextUnionFieldSets = [] } =
        nextTypeInfo;

      if (isUnion && nextFields) {
        const newUnionFieldSet = Object.keys(nextFields);

        typeInfo = {
          ...typeInfo,
          unionFieldSets: [
            ...existingFieldSets,
            ...nextUnionFieldSets,
            newUnionFieldSet,
          ],
        };
      }

      typeInfo = {
        ...typeInfo,
        fields: {
          ...existingFields,
          ...nextFields,
        },
      };
    }
  }

  return typeInfo;
};
