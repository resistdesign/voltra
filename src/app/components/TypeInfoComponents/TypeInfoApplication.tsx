import { FC, ReactNode, useState } from "react";
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
  ItemViewOperation,
  useTypeNavHistory,
} from "./TypeInfoApplication/TypeNavUtils";
import { useTypeInfoState } from "./TypeInfoApplication/TypeInfoStateUtils";
import { useTypeInfoDataStore } from "./TypeInfoApplication/TypeInfoDataUtils";
import {
  ListItemsConfig,
  ListItemsResults,
  LogicalOperators,
} from "../../../common/SearchTypes";
import { ObjectSearch } from "./TypeInfoApplication/ObjectSearch";

export type TypeOperationConfig =
  | {
      baseOperation: Exclude<ItemViewOperation, TypeOperation.CREATE>;
      basePrimaryKeyValue: string;
    }
  | {
      baseOperation?: TypeOperation.CREATE | never;
      basePrimaryKeyValue?: never;
    };

export type TypeInfoApplicationProps = {
  typeInfoMap: TypeInfoMap;
  baseTypeInfoName: string;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  baseValue: TypeInfoDataStructure;
  onBaseValueChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
  baseMode: TypeNavigationMode;
} & TypeOperationConfig;

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
  baseOperation = TypeOperation.CREATE,
  basePrimaryKeyValue,
}): ReactNode => {
  // TODO: Need tooling to manage these table/search related values.
  const [listItemsConfig, setListItemsConfig] = useState<ListItemsConfig>({
    cursor: undefined,
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.OR,
      fieldCriteria: [],
    },
    sortFields: [],
  });
  const [listItemResults, setListItemResults] = useState<
    ListItemsResults<TypeInfoDataItem>
  >({
    cursor: undefined,
    items: [],
  });
  const [selectable, setSelectable] = useState<boolean>(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

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
      onNavigateToType={onNavigateToType}
    />
  ) : // TODO: Need ObjectSearch for related items, but without the search.
  toMode === TypeNavigationMode.RELATED_ITEMS ? (
    targetTypeName && targetTypeInfo ? (
      <ObjectSearch
        typeInfoMap={typeInfoMap}
        typeInfoName={targetTypeName}
        typeInfo={targetTypeInfo}
        listItemsConfig={listItemsConfig}
        onListItemsConfigChange={setListItemsConfig}
        listItemsResults={listItemResults}
        onNavigateToType={onNavigateToType}
        customInputTypeMap={customInputTypeMap}
        selectable={selectable}
        selectedIndices={selectedIndices}
        onSelectedIndicesChange={setSelectedIndices}
        hideSearchControls
      />
    ) : undefined
  ) : toMode === TypeNavigationMode.SEARCH_ITEMS ? (
    targetTypeName && targetTypeInfo ? (
      <ObjectSearch
        typeInfoMap={typeInfoMap}
        typeInfoName={targetTypeName}
        typeInfo={targetTypeInfo}
        listItemsConfig={listItemsConfig}
        onListItemsConfigChange={setListItemsConfig}
        listItemsResults={listItemResults}
        onNavigateToType={onNavigateToType}
        customInputTypeMap={customInputTypeMap}
        selectable={selectable}
        selectedIndices={selectedIndices}
        onSelectedIndicesChange={setSelectedIndices}
      />
    ) : undefined
  ) : undefined;
};
