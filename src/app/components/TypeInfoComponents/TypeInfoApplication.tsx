import { FC, ReactNode, useCallback, useState } from "react";
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
  TypeNavigation,
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
  // TODO: Needs paging.
  onRequestRelatedItems?: (
    typeInfoName: string,
    primaryFieldValue: any,
    fromFieldName: string,
  ) => void;
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
  onRequestRelatedItems,
}): ReactNode => {
  // TODO: Change when selecting an item from list mode.
  const [targetPrimaryFieldValue, setTargetPrimaryFieldValue] = useState<
    string | undefined
  >(basePrimaryKeyValue);
  const {
    relationshipMode,
    fromTypeName,
    fromFieldName,
    toOperation,
    toMode,
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
  const { targetTypeName, targetTypeInfo } = useTypeInfoState({
    typeInfoMap,
    relationshipMode,
    fromTypeName,
    fromFieldName,
  });
  const { dataItem, onDataItemChange } = useTypeInfoDataStore({
    baseValue,
    onBaseValueChange,
    typeName: targetTypeName,
    operation: toOperation,
    primaryFieldValue: targetPrimaryFieldValue,
  });
  const onNavigateToTypeInternal = useCallback(
    (typeNavigation: TypeNavigation) => {
      onNavigateToType(typeNavigation);

      if (onRequestRelatedItems) {
        const { fromTypeName, fromFieldName } = typeNavigation;

        if (typeof fromFieldName !== "undefined") {
          onRequestRelatedItems(
            fromTypeName,
            targetPrimaryFieldValue,
            fromFieldName,
          );
        }
      }
    },
    [onRequestRelatedItems, onNavigateToType, targetPrimaryFieldValue],
  );

  // TODO: Add components for each `TypeNavigationMode`.
  return toMode === TypeNavigationMode.FORM ? (
    <TypeInfoForm
      typeInfoName={targetTypeName as string}
      typeInfo={targetTypeInfo as TypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={dataItem as TypeInfoDataItem}
      operation={toOperation}
      onCancel={onCloseCurrentNavHistoryItem}
      onSubmit={onDataItemChange}
      onNavigateToType={onNavigateToTypeInternal}
    />
  ) : undefined;
};
