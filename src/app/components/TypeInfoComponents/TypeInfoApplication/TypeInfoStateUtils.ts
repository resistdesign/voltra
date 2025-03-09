import { useMemo } from "react";
import { TypeInfo, TypeInfoMap } from "../../../../common/TypeParsing/TypeInfo";

export const useTypeInfoState = ({
  typeInfoMap,
  relationshipMode,
  currentTypeName,
  currentFieldName,
}: {
  typeInfoMap: TypeInfoMap;
  relationshipMode: boolean;
  currentTypeName: string;
  currentFieldName?: string;
}) => {
  const currentTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[currentTypeName],
    [typeInfoMap, currentTypeName],
  );
  const relatedTypeName = useMemo<string | undefined>(() => {
    let typeName: string | undefined;

    if (relationshipMode && typeof currentFieldName !== "undefined") {
      const {
        fields: { [currentFieldName]: { typeReference = undefined } = {} } = {},
      } = currentTypeInfo;

      if (typeof typeReference === "string") {
        typeName = typeReference;
      }
    }

    return typeName;
  }, [relationshipMode, currentFieldName, currentTypeInfo]);
  const relatedTypeInfo = useMemo<TypeInfo | undefined>(
    () =>
      typeof relatedTypeName !== "undefined"
        ? typeInfoMap[relatedTypeName]
        : undefined,
    [typeInfoMap, relatedTypeName],
  );

  return {
    relatedTypeName,
    relatedTypeInfo,
  };
};
