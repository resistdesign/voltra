import { useMemo } from "react";
import { TypeInfo, TypeInfoMap } from "../../../common/TypeParsing/TypeInfo";

export const useTypeInfoState = ({
  typeInfoMap,
  baseTypeInfoName,
  currentFromTypeName,
  relationshipMode,
  currentFromTypeFieldName,
}: {
  typeInfoMap: TypeInfoMap;
  baseTypeInfoName: string;
  currentFromTypeName: string;
  relationshipMode: boolean;
  currentFromTypeFieldName: string;
}) => {
  const baseTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[baseTypeInfoName],
    [typeInfoMap, baseTypeInfoName],
  );
  const currentFromTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[currentFromTypeName],
    [typeInfoMap, currentFromTypeName],
  );
  const toTypeInfoName = useMemo<string>(() => {
    let typeName = baseTypeInfoName;

    if (relationshipMode) {
      const {
        fields: {
          [currentFromTypeFieldName]: { typeReference = undefined } = {},
        } = {},
      } = currentFromTypeInfo;

      if (typeof typeReference === "string") {
        typeName = typeReference;
      }
    }

    return typeName;
  }, [
    baseTypeInfoName,
    relationshipMode,
    currentFromTypeFieldName,
    currentFromTypeInfo,
  ]);
  const toTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[toTypeInfoName],
    [typeInfoMap, toTypeInfoName, baseTypeInfo],
  );

  return {
    baseTypeInfo,
    currentFromTypeInfo,
    toTypeInfoName,
    toTypeInfo,
  };
};
