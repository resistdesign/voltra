import { useMemo, useState } from "react";
import { TypeNavigation, TypeNavigationMode } from "../Types";
import { NonUpdateOperationMode, UpdateOperationMode } from "./Types";
import { TypeOperation } from "../../../../common/TypeParsing/TypeInfo";

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

export const useTypeNavHistory = ({
  baseTypeNavigation,
}: {
  baseTypeNavigation: TypeNavigation;
}) => {
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

  return {
    navHistory,
    setNavHistory,
    relationshipMode,
    currentFromTypeName,
    currentFromTypePrimaryFieldValue,
    currentFromTypeFieldName,
    currentOperation,
  };
};
