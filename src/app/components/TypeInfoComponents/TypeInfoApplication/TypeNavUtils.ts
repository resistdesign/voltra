import { useCallback, useMemo, useState } from "react";
import { TypeNavigation, TypeNavigationMode } from "../Types";
import { NonUpdateOperationMode, UpdateOperationMode } from "./Types";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";
import { isValidTypeNavigation } from "../TypeNavigationUtils";

export const useBaseTypeNavigation = <BaseOperationType extends TypeOperation>({
  baseTypeInfoName,
  basePrimaryKeyValue,
  baseMode,
  baseOperation,
}: {
  baseTypeInfoName: string;
  baseMode: TypeNavigationMode;
  baseOperation: BaseOperationType extends UpdateOperationMode
    ? UpdateOperationMode
    : NonUpdateOperationMode | undefined;
  basePrimaryKeyValue: BaseOperationType extends UpdateOperationMode
    ? string
    : string | undefined;
}) => {
  return useMemo<TypeNavigation>(
    () => ({
      fromTypeName: baseTypeInfoName,
      fromTypePrimaryFieldValue: `${basePrimaryKeyValue}`,
      fromTypeFieldName: "",
      mode: baseMode,
      operation: baseOperation ? baseOperation : TypeOperation.CREATE,
    }),
    [baseTypeInfoName, basePrimaryKeyValue, baseMode, baseOperation],
  );
};

export const useTypeNavHistory = <BaseOperationType extends TypeOperation>({
  typeInfoMap,
  baseTypeInfoName,
  baseMode,
  baseOperation,
  basePrimaryKeyValue,
}: {
  typeInfoMap: TypeInfoMap;
  baseTypeInfoName: string;
  baseMode: TypeNavigationMode;
  baseOperation: BaseOperationType extends UpdateOperationMode
    ? UpdateOperationMode
    : NonUpdateOperationMode | undefined;
  basePrimaryKeyValue: BaseOperationType extends UpdateOperationMode
    ? string
    : string | undefined;
}) => {
  const baseTypeNavigation = useBaseTypeNavigation({
    baseTypeInfoName,
    basePrimaryKeyValue,
    baseMode,
    baseOperation,
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
