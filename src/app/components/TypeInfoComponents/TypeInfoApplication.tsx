import { FC, useCallback, useEffect, useState } from "react";
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
  ListRelationshipsConfig,
  LogicalOperators,
} from "../../../common/SearchTypes";
import { ObjectSearch } from "./TypeInfoApplication/ObjectSearch";
import { TypeInfoORMAPI } from "../../../common/TypeInfoORM";
import { useTypeInfoORMAPI } from "../../utils/TypeInfoORMAPIUtils";
import { useTypeInfoApplicationState } from "./TypeInfoApplication/TypeInfoApplicationStateUtils";
import { ItemRelationshipInfoKeys } from "../../../common/ItemRelationshipInfoTypes";

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
  // TODO: For list modes, we might need some base list config objects.
  baseMode: TypeNavigationMode;
  typeInfoORMAPI: TypeInfoORMAPI;
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
  typeInfoORMAPI,
}) => {
  const { state: typeInfoORMAPIState, api: typeInfoORMAPIService } =
    useTypeInfoORMAPI(typeInfoORMAPI);
  const {
    FORM: {
      loading: formLoading = false,
      item: typeInfoDataItem = {},
      error: formError,
    } = {},
    SEARCH_ITEMS: {
      loading: searchItemsLoading = false,
      listItemsResults: searchItemsResults = {
        items: [],
      },
      error: searchItemsError,
    } = {},
    RELATED_ITEMS: {
      loading: relatedItemsLoading = false,
      listItemsResults: relatedItemsResults = {
        items: [],
      },
      error: relatedItemsError,
    } = {},
  } = useTypeInfoApplicationState(typeInfoORMAPIState);
  const [listItemsConfig, setListItemsConfig] = useState<ListItemsConfig>({
    cursor: undefined,
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.OR,
      fieldCriteria: [],
    },
    sortFields: [],
  });
  // TODO: `setListRelationshipsConfig` will need to be wrapped to convert `ListItemsConfig` to `ListRelationshipsConfig`.
  const [listRelationshipsConfig, setListRelationshipsConfig] =
    useState<ListRelationshipsConfig>({
      cursor: undefined,
      itemsPerPage: 10,
      relationshipItemOrigin: {
        [ItemRelationshipInfoKeys.fromTypeName]: "",
        [ItemRelationshipInfoKeys.fromTypeFieldName]: "",
        [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]: "",
      },
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
    toOperation = baseOperation,
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
  const onSubmit = useCallback(
    (newItem: TypeInfoDataItem) => {
      if (typeof targetTypeName === "string") {
        if (toOperation === TypeOperation.CREATE) {
          typeInfoORMAPIService.create(targetTypeName, newItem);
        } else if (toOperation === TypeOperation.UPDATE) {
          typeInfoORMAPIService.update(targetTypeName, newItem);
        }
      }
    },
    [targetTypeName, toOperation, typeInfoORMAPIService],
  );

  console.log("ITEM:", typeInfoDataItem);

  // TODO: If there is a basePrimaryFieldValue,
  //  then maybe we should just fetch it with the ORM client?
  // TODO: We also need to read items when selected for edit from a list.
  useEffect(() => {
    if (targetTypeName && basePrimaryFieldValue) {
      // TODO: Do we need to use selected fields???
      typeInfoORMAPIService.read(targetTypeName, basePrimaryFieldValue);
    }
  }, [targetTypeName, basePrimaryFieldValue, typeInfoORMAPIService]);

  // TODO: HOW TO RENDER AND DISMISS ERRORS?
  // TODO: How to handle loading states?
  return toMode === TypeNavigationMode.FORM ? (
    <TypeInfoForm
      typeInfoName={targetTypeName as string}
      primaryFieldValue={targetPrimaryFieldValue as string}
      typeInfo={targetTypeInfo as TypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={typeInfoDataItem}
      operation={toOperation}
      onCancel={onCloseCurrentNavHistoryItem}
      onSubmit={onSubmit}
      onNavigateToType={onNavigateToType}
    />
  ) : toMode === TypeNavigationMode.SEARCH_ITEMS ? (
    targetTypeName && targetTypeInfo ? (
      <ObjectSearch
        operation={toOperation}
        typeInfoMap={typeInfoMap}
        typeInfoName={targetTypeName}
        typeInfo={targetTypeInfo}
        listItemsConfig={listItemsConfig}
        onListItemsConfigChange={setListItemsConfig}
        listItemsResults={searchItemsResults}
        onNavigateToType={onNavigateToType}
        customInputTypeMap={customInputTypeMap}
        selectable={selectable}
        selectedIndices={selectedIndices}
        onSelectedIndicesChange={setSelectedIndices}
      />
    ) : undefined
  ) : toMode === TypeNavigationMode.RELATED_ITEMS ? (
    targetTypeName && targetTypeInfo ? (
      <ObjectSearch
        operation={toOperation}
        typeInfoMap={typeInfoMap}
        typeInfoName={targetTypeName}
        typeInfo={targetTypeInfo}
        listItemsConfig={listRelationshipsConfig}
        onListItemsConfigChange={setListRelationshipsConfig}
        listItemsResults={relatedItemsResults}
        onNavigateToType={onNavigateToType}
        customInputTypeMap={customInputTypeMap}
        selectable={selectable}
        selectedIndices={selectedIndices}
        onSelectedIndicesChange={setSelectedIndices}
        hideSearchControls
      />
    ) : undefined
  ) : undefined;
};
