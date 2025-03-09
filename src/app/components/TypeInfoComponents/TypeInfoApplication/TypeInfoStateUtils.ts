import { useMemo } from "react";
import { TypeInfo, TypeInfoMap } from "../../../../common/TypeParsing/TypeInfo";

export const useTypeInfoState = ({
  typeInfoMap,
  relationshipMode,
  fromTypeName,
  fromTypeFieldName,
}: {
  typeInfoMap: TypeInfoMap;
  relationshipMode: boolean;
  fromTypeName: string;
  fromTypeFieldName?: string;
}) => {
  const fromTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[fromTypeName],
    [typeInfoMap, fromTypeName],
  );
  const toTypeName = useMemo<string | undefined>(() => {
    let typeName: string | undefined;

    if (relationshipMode && typeof fromTypeFieldName !== "undefined") {
      const {
        fields: {
          [fromTypeFieldName]: { typeReference = undefined } = {},
        } = {},
      } = fromTypeInfo;

      if (typeof typeReference === "string") {
        typeName = typeReference;
      }
    }

    return typeName;
  }, [relationshipMode, fromTypeFieldName, fromTypeInfo]);
  const toTypeInfo = useMemo<TypeInfo | undefined>(
    () =>
      typeof toTypeName !== "undefined" ? typeInfoMap[toTypeName] : undefined,
    [typeInfoMap, toTypeName],
  );

  return {
    targetTypeName: relationshipMode ? toTypeName : fromTypeName,
    targetTypeInfo: relationshipMode ? toTypeInfo : fromTypeInfo,
  };
};
