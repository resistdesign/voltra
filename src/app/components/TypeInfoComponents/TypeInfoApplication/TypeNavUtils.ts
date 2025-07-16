import { useCallback, useMemo, useState } from "react";
import { TypeNavigation, TypeNavigationMode } from "../Types";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";
import { ExpandComplexType } from "../../../../common/HelperTypes";

export type ItemViewOperation = Exclude<TypeOperation, TypeOperation.DELETE>;

export type TypeNavigationOperationConfig = {
  baseOperation: ItemViewOperation;
  basePrimaryFieldValue?: string;
  baseTypeInfoName: string;
  baseMode: TypeNavigationMode;
};

export const useBaseTypeNavigation = ({
  baseTypeInfoName,
  basePrimaryFieldValue,
  baseMode,
  baseOperation,
}: TypeNavigationOperationConfig) => {
  return useMemo<TypeNavigation>(
    () => ({
      fromTypeName: baseTypeInfoName,
      fromTypePrimaryFieldValue:
        typeof basePrimaryFieldValue !== "undefined"
          ? basePrimaryFieldValue
          : "",
      fromTypeFieldName: "",
      toOperation: baseOperation,
      toMode: baseMode,
    }),
    [baseTypeInfoName, basePrimaryFieldValue, baseOperation, baseMode],
  );
};

export type TypeNavigationHistoryController = ExpandComplexType<
  TypeNavigation & {
    relationshipMode: boolean;
    onNavigateToType: (typeNavigation: TypeNavigation) => void;
    onCloseCurrentNavHistoryItem: () => void;
  }
>;

export const useTypeNavHistory = ({
  typeInfoMap,
  baseTypeInfoName,
  baseMode,
  baseOperation,
  basePrimaryFieldValue,
}: {
  typeInfoMap: TypeInfoMap;
} & TypeNavigationOperationConfig): TypeNavigationHistoryController => {
  const baseTypeNavigation = useBaseTypeNavigation({
    baseTypeInfoName,
    baseMode,
    baseOperation,
    basePrimaryFieldValue,
  });
  const [navHistory, setNavHistory] = useState<TypeNavigation[]>([]);
  const currentTypeNavigation = useMemo<TypeNavigation>(
    () => navHistory[navHistory.length - 1] ?? baseTypeNavigation,
    [navHistory, baseTypeNavigation],
  );
  const {
    fromTypeName,
    fromTypeFieldName,
    fromTypePrimaryFieldValue,
    toOperation,
    toMode,
    toTypePrimaryFieldValue,
  } = currentTypeNavigation;
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
    fromTypePrimaryFieldValue,
    toOperation,
    toMode,
    toTypePrimaryFieldValue,
    onNavigateToType,
    onCloseCurrentNavHistoryItem,
  };
};
