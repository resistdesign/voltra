import { useMemo } from "react";
import { TypeInfo, TypeInfoMap } from "../../../../common/TypeParsing/TypeInfo";

export const useTypeInfoState = ({
  typeInfoMap,
  relationshipMode,
  fromTypeName,
  fromFieldName,
}: {
  typeInfoMap: TypeInfoMap;
  relationshipMode: boolean;
  fromTypeName: string;
  fromFieldName?: string;
}) => {
  const fromTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[fromTypeName],
    [typeInfoMap, fromTypeName],
  );
  const toTypeName = useMemo<string | undefined>(() => {
    let typeName: string | undefined;

    if (relationshipMode && typeof fromFieldName !== "undefined") {
      const {
        fields: { [fromFieldName]: { typeReference = undefined } = {} } = {},
      } = fromTypeInfo;

      if (typeof typeReference === "string") {
        typeName = typeReference;
      }
    }

    return typeName;
  }, [relationshipMode, fromFieldName, fromTypeInfo]);
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
