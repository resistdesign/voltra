import { FC, ReactNode } from "react";
import { TypeInfoForm } from "./TypeInfoApplication/TypeInfoForm";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoMap,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  InputComponent,
  TypeInfoDataStructure,
  TypeNavigationMode,
} from "./Types";
import {
  TypeNavigationOperationConfig,
  useTypeNavHistory,
} from "./TypeInfoApplication/TypeNavUtils";
import { useTypeInfoState } from "./TypeInfoApplication/TypeInfoStateUtils";
import { useTypeInfoDataStore } from "./TypeInfoApplication/TypeInfoDataUtils";

export type TypeInfoApplicationProps = {
  typeInfoMap: TypeInfoMap;
  baseTypeInfoName: string;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  baseValue: TypeInfoDataStructure;
  onBaseValueChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
  baseMode: TypeNavigationMode;
} & TypeNavigationOperationConfig;

/**
 * Create a multi-type driven type information form application.
 * */
export const TypeInfoApplication: FC<TypeInfoApplicationProps> = ({
  typeInfoMap,
  baseTypeInfoName,
  customInputTypeMap,
  baseValue,
  onBaseValueChange,
  baseMode = TypeNavigationMode.FORM,
  baseOperation,
  basePrimaryKeyValue,
}): ReactNode => {
  const {
    relationshipMode,
    currentTypeName,
    currentFieldName,
    currentOperation,
    currentMode,
    onNavigateToType,
    onCloseCurrentNavHistoryItem,
  } = useTypeNavHistory({
    typeInfoMap,
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
  const { toTypeInfoName, toTypeInfo } = useTypeInfoState({
    typeInfoMap,
    baseTypeInfoName,
    currentTypeName,
    relationshipMode,
    currentFieldName,
  });
  const { currentDataItem, onCurrentDataItemChange } = useTypeInfoDataStore({
    baseValue,
    toTypeInfoName,
    currentOperation,
    currentTypeName,
    onBaseValueChange,
  });

  // TODO: Add components for each `TypeNavigationMode`.
  return currentMode ? (
    <TypeInfoForm
      typeInfoName={toTypeInfoName as string}
      typeInfo={toTypeInfo as TypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={currentDataItem as TypeInfoDataItem}
      operation={currentOperation}
      onCancel={onCloseCurrentNavHistoryItem}
      onSubmit={onCurrentDataItemChange}
      onNavigateToType={onNavigateToType}
    />
  ) : undefined;
};
