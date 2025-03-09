import { useMemo } from "react";
import { TypeInfo, TypeInfoMap } from "../../../../common/TypeParsing/TypeInfo";

export const useTypeInfoState = ({
  typeInfoMap,
  baseTypeInfoName,
  currentTypeName,
  relationshipMode,
  currentFieldName,
}: {
  typeInfoMap: TypeInfoMap;
  baseTypeInfoName: string;
  currentTypeName: string;
  relationshipMode: boolean;
  currentFieldName?: string;
}) => {
  const baseTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[baseTypeInfoName],
    [typeInfoMap, baseTypeInfoName],
  );
  const currentTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[currentTypeName],
    [typeInfoMap, currentTypeName],
  );
  const toTypeInfoName = useMemo<string | undefined>(() => {
    let typeName = relationshipMode ? undefined : baseTypeInfoName;

    if (relationshipMode && typeof currentFieldName !== "undefined") {
      const {
        fields: { [currentFieldName]: { typeReference = undefined } = {} } = {},
      } = currentTypeInfo;

      if (typeof typeReference === "string") {
        typeName = typeReference;
      }
    }

    return typeName;
  }, [baseTypeInfoName, relationshipMode, currentFieldName, currentTypeInfo]);
  const toTypeInfo = useMemo<TypeInfo | undefined>(
    () =>
      typeof toTypeInfoName !== "undefined"
        ? typeInfoMap[toTypeInfoName]
        : undefined,
    [typeInfoMap, toTypeInfoName, baseTypeInfo],
  );

  return {
    baseTypeInfo,
    currentTypeInfo,
    toTypeInfoName,
    toTypeInfo,
  };
};
