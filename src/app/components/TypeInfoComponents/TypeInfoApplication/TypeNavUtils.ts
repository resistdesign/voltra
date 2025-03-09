import { useCallback, useMemo, useState } from "react";
import { TypeNavigation, TypeNavigationMode } from "../Types";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";
import { isValidTypeNavigation } from "../TypeNavigationUtils";

export type TypeNavigationOperationConfig =
  | { baseOperation?: TypeOperation.CREATE; basePrimaryKeyValue?: string }
  | {
      baseOperation: TypeOperation.READ | TypeOperation.UPDATE;
      basePrimaryKeyValue: string;
    };

export const useBaseTypeNavigation = ({
  baseTypeInfoName,
  baseMode,
  baseOperation = TypeOperation.CREATE,
  basePrimaryKeyValue,
}: {
  baseTypeInfoName: string;
  baseMode: TypeNavigationMode;
} & TypeNavigationOperationConfig) => {
  return useMemo<TypeNavigation>(
    () => ({
      fromTypeName: baseTypeInfoName,
      fromTypePrimaryFieldValue: `${basePrimaryKeyValue}`,
      fromTypeFieldName: "",
      mode: baseMode,
      operation: baseOperation,
    }),
    [baseTypeInfoName, basePrimaryKeyValue, baseMode, baseOperation],
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
  const relationshipMode = navHistory.length > 0;
  const currentTypeNavigation = useMemo<TypeNavigation>(
    () => navHistory[navHistory.length - 1] || baseTypeNavigation,
    [navHistory, baseTypeNavigation],
  );
  const {
    fromTypeName: currentFromTypeName,
    fromTypePrimaryFieldValue: currentFromTypePrimaryFieldValue,
    fromTypeFieldName: currentFromTypeFieldName,
    operation: currentOperation,
  } = currentTypeNavigation;
  const onNavigateToType = useCallback(
    (typeNavigation: TypeNavigation) => {
      if (isValidTypeNavigation(typeNavigation, typeInfoMap)) {
        setNavHistory((prevNavHistory) => [...prevNavHistory, typeNavigation]);
      }
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
    currentFromTypeName,
    currentFromTypePrimaryFieldValue,
    currentFromTypeFieldName,
    currentOperation,
    onNavigateToType,
    onCloseCurrentNavHistoryItem,
  };
};
