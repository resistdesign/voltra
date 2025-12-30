import { SyntaxKind, TypeReferenceNode } from "typescript";
import { TypeMap } from "../TypeMapping";
import { TypeInfo } from "../TypeInfo";
import { FIELD_FILTERS } from "./Constants";
import { getUnionOrLiteralStringValues } from "./getUnionOrLiteralStringValues";
import { getTypeInfoFromTypeAlias } from "./getTypeInfoFromTypeAlias";

const getTypeInfoFromPickOmitFieldFilters = (
  typeNameStr: string | undefined,
  typeRef: TypeReferenceNode,
  typeMap: TypeMap,
): TypeInfo | undefined => {
  const picking = typeNameStr === FIELD_FILTERS.PICK;
  const omitTypeKind = typeRef.typeArguments?.[0].kind;

  let typeInfo: TypeInfo | undefined;

  if (
    omitTypeKind === SyntaxKind.TypeReference &&
    typeRef.typeArguments &&
    typeRef.typeArguments[0].kind === SyntaxKind.TypeReference
  ) {
    const omitType = typeRef.typeArguments[0] as TypeReferenceNode;
    const omitTypeFields = typeRef.typeArguments[1];
    const omitTypeName = omitType.typeName.getText();
    const refNode = typeMap[omitTypeName];

    if (refNode) {
      const {
        fields: existingFields = {},
        unionFieldSets: existingUnionFieldSets,
        ...typeInfoOther
      }: Partial<TypeInfo> = getTypeInfoFromTypeAlias(refNode, typeMap) || {};
      const omitFieldNames: string[] =
        getUnionOrLiteralStringValues(omitTypeFields);
      const cleanTypeInfoFields: TypeInfo["fields"] = Object.keys(
        existingFields,
      ).reduce(
        (acc, key) => {
          if (
            acc &&
            ((picking && omitFieldNames.includes(key)) ||
              (!picking && !omitFieldNames.includes(key))) &&
            existingFields[key]
          ) {
            acc[key] = existingFields[key];
          }

          return acc;
        },
        {} as TypeInfo["fields"],
      );
      const cleanUnionFieldSets = existingUnionFieldSets
        ? existingUnionFieldSets.map((fieldSet) =>
            fieldSet.filter((field) =>
              picking
                ? omitFieldNames.includes(field)
                : !omitFieldNames.includes(field),
            ),
          )
        : undefined;

      typeInfo = {
        ...typeInfoOther,
        fields: cleanTypeInfoFields,
        unionFieldSets: cleanUnionFieldSets,
      };
    }
  }

  return typeInfo;
};

const getTypeInfoFromExcludeFieldFilter = (
  typeNameStr: string | undefined,
  typeRef: TypeReferenceNode,
  typeMap: TypeMap,
): TypeInfo | undefined => {
  const baseTypeKind = typeRef.typeArguments?.[0].kind;
  const excludeTypeKind = typeRef.typeArguments?.[1].kind;

  let typeInfo: TypeInfo | undefined;

  if (
    baseTypeKind === SyntaxKind.TypeReference &&
    excludeTypeKind === SyntaxKind.TypeReference &&
    typeRef.typeArguments
  ) {
    const baseType = typeRef.typeArguments[0] as TypeReferenceNode;
    const excludeType = typeRef.typeArguments[1] as TypeReferenceNode;
    const baseTypeName = baseType.typeName.getText();
    const excludeTypeName = excludeType.typeName.getText();
    const refNode = typeMap[baseTypeName];
    const excludeNode = typeMap[excludeTypeName];

    if (refNode && excludeNode) {
      const baseTypeInfo = getTypeInfoFromTypeAlias(refNode, typeMap);
      const excludeTypeInfo = getTypeInfoFromTypeAlias(excludeNode, typeMap);

      if (baseTypeInfo && excludeTypeInfo) {
        const {
          fields: baseFields = {},
          unionFieldSets: existingUnionFieldSets,
        } = baseTypeInfo;
        const { fields: excludeFields = {} } = excludeTypeInfo;
        const excludeFieldNames = Object.keys(excludeFields);
        const cleanTypeInfoFields: TypeInfo["fields"] = Object.keys(
          baseFields,
        ).reduce(
          (acc, key) => {
            if (acc && !excludeFieldNames.includes(key) && baseFields[key]) {
              acc[key] = baseFields[key];
            }

            return acc;
          },
          {} as TypeInfo["fields"],
        );
        const cleanUnionFieldSets = existingUnionFieldSets
          ? existingUnionFieldSets.map((fieldSet) =>
              fieldSet.filter((field) => !excludeFieldNames.includes(field)),
            )
          : undefined;

        typeInfo = {
          ...baseTypeInfo,
          fields: cleanTypeInfoFields,
          unionFieldSets: cleanUnionFieldSets,
        };
      }
    }
  }

  return typeInfo;
};

const defaultFieldFilterProcessor = (
  typeNameStr: string | undefined,
  typeRef: TypeReferenceNode,
  typeMap: TypeMap,
): TypeInfo | undefined => {
  const refNode = typeNameStr ? typeMap[typeNameStr] : undefined;

  let typeInfo: TypeInfo | undefined;

  if (refNode) {
    typeInfo = getTypeInfoFromTypeAlias(refNode, typeMap);
  }

  return typeInfo;
};

const FIELD_FILTER_PROCESSORS: Record<
  string,
  (
    typeNameStr: string | undefined,
    typeRef: TypeReferenceNode,
    typeMap: TypeMap,
  ) => TypeInfo | undefined
> = {
  [FIELD_FILTERS.PICK]: getTypeInfoFromPickOmitFieldFilters,
  [FIELD_FILTERS.OMIT]: getTypeInfoFromPickOmitFieldFilters,
  [FIELD_FILTERS.EXCLUDE]: getTypeInfoFromExcludeFieldFilter,
};

/**
 * Resolve TypeInfo for field-filter helper types (Pick/Omit/Exclude).
 *
 * @param typeNameStr - Type name or filter identifier.
 * @param typeRef - Type reference node with type arguments.
 * @param typeMap - Map of available type aliases.
 * @returns Filtered TypeInfo or undefined when not resolvable.
 */
export const getTypeInfoFromFieldFilter = (
  typeNameStr: string | undefined,
  typeRef: TypeReferenceNode,
  typeMap: TypeMap,
): TypeInfo | undefined => {
  const processor = typeNameStr
    ? FIELD_FILTER_PROCESSORS[typeNameStr]
    : undefined;

  return processor
    ? processor(typeNameStr, typeRef, typeMap)
    : defaultFieldFilterProcessor(typeNameStr, typeRef, typeMap);
};
