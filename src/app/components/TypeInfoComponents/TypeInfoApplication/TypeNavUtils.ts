import { useCallback, useMemo, useState } from "react";
import { TypeNavigation, TypeNavigationMode } from "../Types";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";

export type TypeNavigationOperationConfig =
  | { baseOperation?: TypeOperation.CREATE; basePrimaryKeyValue?: string }
  | {
      baseOperation: TypeOperation.READ | TypeOperation.UPDATE;
      basePrimaryKeyValue: string;
    };

export const useBaseTypeNavigation = ({
  baseTypeInfoName,
  baseMode,
  baseOperation,
}: {
  baseTypeInfoName: string;
  baseMode: TypeNavigationMode;
} & TypeNavigationOperationConfig) => {
  return useMemo<TypeNavigation>(
    () => ({
      fromTypeName: baseTypeInfoName,
      toOperation: baseOperation,
      toMode: baseMode,
    }),
    [baseTypeInfoName, baseMode, baseOperation],
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
  baseTypeInfoName: string;
  baseMode: TypeNavigationMode;
} & TypeNavigationOperationConfig) => {
  const baseTypeNavigation = useBaseTypeNavigation({
    baseTypeInfoName,
    baseMode,
    ...(baseOperation === TypeOperation.CREATE || baseOperation === undefined
      ? {
          baseOperation,
          basePrimaryKeyValue,
        }
      : {
          baseOperation,
          basePrimaryKeyValue: basePrimaryKeyValue as string,
        }),
  });
  const [navHistory, setNavHistory] = useState<TypeNavigation[]>([]);
  const currentTypeNavigation = useMemo<TypeNavigation>(
    () => navHistory[navHistory.length - 1] || baseTypeNavigation,
    [navHistory, baseTypeNavigation],
  );
  const { fromTypeName, fromFieldName, toOperation, toMode } =
    currentTypeNavigation;
  const relationshipMode =
    navHistory.length > 0 && typeof fromFieldName !== "undefined";
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
    fromFieldName,
    toOperation,
    toMode,
    onNavigateToType,
    onCloseCurrentNavHistoryItem,
  };
};
