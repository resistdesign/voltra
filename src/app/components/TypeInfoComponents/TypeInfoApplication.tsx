import { FC, ReactNode, useCallback, useState } from "react";
import { TypeInfoForm } from "./TypeInfoApplication/TypeInfoForm";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoMap,
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
import {
  ListRelationshipsConfig,
  ListRelationshipsResults,
} from "../../../common/SearchTypes";

export type TypeInfoApplicationProps = {
  typeInfoMap: TypeInfoMap;
  baseTypeInfoName: string;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  baseValue: TypeInfoDataStructure;
  onBaseValueChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
  baseMode: TypeNavigationMode;
  listRelationshipsResults?: ListRelationshipsResults;
  onListRelationships?: (
    listRelationshipsConfig: ListRelationshipsConfig,
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
  listRelationshipsResults,
  onListRelationships,
}): ReactNode => {
  // TODO: Change when selecting an item from list mode.
  // TODO: Probably needs to be in the history.
  const [targetPrimaryFieldValue, setTargetPrimaryFieldValue] = useState<
    string | undefined
  >(basePrimaryKeyValue);
  const {
    relationshipMode,
    fromTypeName,
    fromTypeFieldName,
    toOperation,
    toMode,
    onNavigateToType,
    onCloseCurrentNavHistoryItem,
  } = useTypeNavHistory({
    typeInfoMap,
    baseTypeInfoName,
    baseMode,
    baseOperation,
    basePrimaryKeyValue,
  });
  const { targetTypeName, targetTypeInfo } = useTypeInfoState({
    typeInfoMap,
    relationshipMode,
    fromTypeName,
    fromTypeFieldName,
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

      if (onListRelationships) {
        const {
          fromTypeName: tNFromTypeName,
          fromTypePrimaryFieldValue: tNFromTypePrimaryFieldValue,
          fromTypeFieldName: tNFromTypeFieldName,
        } = typeNavigation;

        // TODO: This probably get done by the list table that shows up, not here.
        onListRelationships({
          relationshipItemOrigin: {
            fromTypeName: tNFromTypeName,
            fromTypePrimaryFieldValue: tNFromTypePrimaryFieldValue,
            fromTypeFieldName: tNFromTypeFieldName,
          },
          // TODO: These are placeholders.
          cursor: "",
          itemsPerPage: 10,
        });
      }
    },
    [onListRelationships, onNavigateToType, targetPrimaryFieldValue],
  );

  // TODO: Add components for each `TypeNavigationMode`.
  return toMode === TypeNavigationMode.FORM ? (
    <TypeInfoForm
      typeInfoName={targetTypeName as string}
      primaryFieldValue={targetPrimaryFieldValue as string}
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
