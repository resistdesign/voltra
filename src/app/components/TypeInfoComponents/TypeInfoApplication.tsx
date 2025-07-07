import { FC, useState } from "react";
import { TypeInfoForm } from "./TypeInfoApplication/TypeInfoForm";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoMap,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import { InputComponent, TypeNavigationMode } from "./Types";
import {
  ItemViewOperation,
  useTypeNavHistory,
} from "./TypeInfoApplication/TypeNavUtils";
import { useTypeInfoState } from "./TypeInfoApplication/TypeInfoStateUtils";
import {
  ListItemsConfig,
  ListItemsResults,
  LogicalOperators,
} from "../../../common/SearchTypes";
import { ObjectSearch } from "./TypeInfoApplication/ObjectSearch";
import { TypeInfoORMClient } from "../../utils";

export type TypeOperationConfig =
  | {
      baseOperation: Exclude<ItemViewOperation, TypeOperation.CREATE>;
      basePrimaryFieldValue: string;
    }
  | {
      baseOperation?: TypeOperation.CREATE | never;
      basePrimaryFieldValue?: never;
    };

export type TypeInfoApplicationProps = {
  typeInfoMap: TypeInfoMap;
  baseTypeInfoName: string;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  baseMode: TypeNavigationMode;
  // TODO: I think we need a `useTypeInfoORMClient` to watch
  //  loading and errors and things like that.
  //  We probably also need to track specific requests.
  typeInfoORMClient: TypeInfoORMClient;
} & TypeOperationConfig;

/**
 * Create a multi-type driven type information form application.
 * */
export const TypeInfoApplication: FC<TypeInfoApplicationProps> = ({
  typeInfoMap,
  baseTypeInfoName,
  customInputTypeMap,
  baseMode = TypeNavigationMode.FORM,
  baseOperation = TypeOperation.CREATE,
  basePrimaryFieldValue,
}) => {
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
  const [listItemsResults, setListItemsResults] = useState<
    ListItemsResults<TypeInfoDataItem>
  >({
    cursor: undefined,
    items: [],
  });
  // TODO: Add relationship versions of the above list config/results???
  const [selectable, setSelectable] = useState<boolean>(true);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // TODO: Change when selecting an item from list mode.
  // TODO: Probably needs to be in the history.
  const [targetPrimaryFieldValue, setTargetPrimaryFieldValue] = useState<
    string | undefined
  >(basePrimaryFieldValue);
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
    basePrimaryFieldValue,
  });
  const { targetTypeName, targetTypeInfo } = useTypeInfoState({
    typeInfoMap,
    relationshipMode,
    fromTypeName,
    fromTypeFieldName,
  });
  const { primaryField }: Partial<TypeInfo> = targetTypeInfo || {};
  const [typeInfoDataItem, setTypeInfoDataItem] = useState<TypeInfoDataItem>(
    // TODO: Should we have a default typeInfoDataItem?
    typeof primaryField !== "undefined" &&
      typeof basePrimaryFieldValue !== "undefined"
      ? {
          [primaryField]: basePrimaryFieldValue,
        }
      : {},
  );

  console.log("ITEM:", typeInfoDataItem);

  // TODO: If there is a basePrimaryFieldValue,
  //  then maybe we should just fetch it with the ORM client?

  return toMode === TypeNavigationMode.FORM ? (
    <TypeInfoForm
      typeInfoName={targetTypeName as string}
      primaryFieldValue={targetPrimaryFieldValue as string}
      typeInfo={targetTypeInfo as TypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={typeInfoDataItem}
      operation={toOperation}
      onCancel={onCloseCurrentNavHistoryItem}
      onSubmit={setTypeInfoDataItem}
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
        listItemsResults={listItemsResults}
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
        listItemsResults={listItemsResults}
        onNavigateToType={onNavigateToType}
        customInputTypeMap={customInputTypeMap}
        selectable={selectable}
        selectedIndices={selectedIndices}
        onSelectedIndicesChange={setSelectedIndices}
      />
    ) : undefined
  ) : undefined;
};
