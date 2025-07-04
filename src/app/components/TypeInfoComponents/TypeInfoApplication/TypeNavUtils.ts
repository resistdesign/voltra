import { useCallback, useMemo, useState } from "react";
import { TypeNavigation, TypeNavigationMode } from "../Types";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";

export type ItemViewOperation = Exclude<TypeOperation, TypeOperation.DELETE>;

export type TypeNavigationOperationConfig = {
  baseOperation: ItemViewOperation;
  basePrimaryKeyValue?: string;
  baseTypeInfoName: string;
  baseMode: TypeNavigationMode;
};

export const useBaseTypeNavigation = ({
  baseTypeInfoName,
  basePrimaryKeyValue,
  baseMode,
  baseOperation,
}: TypeNavigationOperationConfig) => {
  return useMemo<TypeNavigation>(
    () => ({
      fromTypeName: baseTypeInfoName,
      fromTypePrimaryFieldValue:
        typeof basePrimaryKeyValue !== "undefined" ? basePrimaryKeyValue : "",
      fromTypeFieldName: "",
      toOperation: baseOperation,
      toMode: baseMode,
    }),
    [baseTypeInfoName, basePrimaryKeyValue, baseOperation, baseMode],
  );
};

export const useTypeNavHistory = ({
  typeInfoMap,
  baseTypeInfoName,
  baseMode,
  baseOperation,
  basePrimaryKeyValue,
}: {
  typeInfoMap: TypeInfoMap;
} & TypeNavigationOperationConfig) => {
  const baseTypeNavigation = useBaseTypeNavigation({
    baseTypeInfoName,
    baseMode,
    baseOperation,
    basePrimaryKeyValue,
  });
  const [navHistory, setNavHistory] = useState<TypeNavigation[]>([]);
  const currentTypeNavigation = useMemo<TypeNavigation>(
    () => navHistory[navHistory.length - 1] || baseTypeNavigation,
    [navHistory, baseTypeNavigation],
  );
  const { fromTypeName, fromTypeFieldName, toOperation, toMode } =
    currentTypeNavigation;
  const relationshipMode =
    navHistory.length > 0 && typeof fromTypeFieldName !== "undefined";
  const onNavigateToType = useCallback(
    (typeNavigation: TypeNavigation) => {
      setNavHistory((prevNavHistory) => [...prevNavHistory, typeNavigation]);
    },
    [typeInfoMap],
  );
  const onCloseCurrentNavHistoryItem = useCallback(() => {
    setNavHistory((prevNavHistory) => {
      if (prevNavHistory.length > 0) {
        const [_currentNavHistoryItem, ...restNavHistory] = [
          ...prevNavHistory,
        ].reverse();

        return restNavHistory.reverse();
      } else {
        return prevNavHistory;
      }
    });
  }, []);

  return {
    relationshipMode,
    fromTypeName,
    fromTypeFieldName,
    toOperation,
    toMode,
    onNavigateToType,
    onCloseCurrentNavHistoryItem,
  };
};
