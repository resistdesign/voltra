import { FC, useCallback, useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
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
import {
  TypeInfoORMAPI,
  TypeInfoORMServiceError,
} from "../../../common/TypeInfoORM";
import { useTypeInfoORMAPI } from "../../utils/TypeInfoORMAPIUtils";
import { useTypeInfoApplicationState } from "./TypeInfoApplication/TypeInfoApplicationStateUtils";
import { ItemRelationshipInfoKeys } from "../../../common/ItemRelationshipInfoTypes";

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const ModeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75em;
`;

const LoadingIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  color: #4b5563;
  font-size: 0.95em;
`;

const Spinner = styled.span`
  width: 1em;
  height: 1em;
  border: 2px solid #d1d1d1;
  border-top-color: #5c6ac4;
  border-radius: 50%;
  display: inline-block;
  animation: ${spinAnimation} 0.8s linear infinite;
`;

const ErrorBanner = styled.div`
  padding: 0.75em 1em;
  border-radius: 4px;
  border: 1px solid #e5b3b0;
  background-color: #fff1f0;
  color: #8a1c1c;
`;

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
      item: typeInfoDataItem,
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
  // TODO: WHEN is something selectable?
  const [selectable, setSelectable] = useState<boolean>(true);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [relatedSelectable, setRelatedSelectable] = useState<boolean>(true);
  const [relatedSelectedIndices, setRelatedSelectedIndices] = useState<
    number[]
  >([]);
  const {
    relationshipMode,
    fromTypeName,
    fromTypeFieldName,
    toOperation = baseOperation,
    toMode,
    toTypePrimaryFieldValue,
    onNavigateToType,
    onCloseCurrentNavHistoryItem,
  } = useTypeNavHistory({
    typeInfoMap,
    baseTypeInfoName,
    baseMode,
    baseOperation,
    basePrimaryFieldValue,
  });
  const targetPrimaryFieldValue = useMemo<string | undefined>(
    () => toTypePrimaryFieldValue ?? basePrimaryFieldValue,
    [toTypePrimaryFieldValue, basePrimaryFieldValue],
  );
  const { targetTypeName, targetTypeInfo } = useTypeInfoState({
    typeInfoMap,
    relationshipMode,
    fromTypeName,
    fromTypeFieldName,
  });
  const onListRelationshipsConfigChange = useCallback(
    ({ cursor, itemsPerPage }: ListItemsConfig) => {
      if (targetPrimaryFieldValue) {
        setListRelationshipsConfig({
          cursor,
          itemsPerPage,
          relationshipItemOrigin: {
            [ItemRelationshipInfoKeys.fromTypeName]: fromTypeName,
            [ItemRelationshipInfoKeys.fromTypeFieldName]: fromTypeFieldName,
            [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]:
              targetPrimaryFieldValue,
          },
        });
      }
    },
    [fromTypeName, fromTypeFieldName, targetPrimaryFieldValue],
  );
  const onSubmit = useCallback(
    (newItem: TypeInfoDataItem) => {
      if (targetTypeName) {
        if (toOperation === TypeOperation.CREATE) {
          typeInfoORMAPIService.create(targetTypeName, newItem);
        } else if (toOperation === TypeOperation.UPDATE) {
          typeInfoORMAPIService.update(targetTypeName, newItem);
        }
      }

      // TODO: What to do when closing the top-level history item?
      onCloseCurrentNavHistoryItem();
    },
    [
      targetTypeName,
      toOperation,
      typeInfoORMAPIService,
      onCloseCurrentNavHistoryItem,
    ],
  );

  useEffect(() => {
    if (targetTypeName && targetPrimaryFieldValue) {
      // TODO: Handle selected fields.
      typeInfoORMAPIService.read(targetTypeName, targetPrimaryFieldValue);
    }
  }, [targetTypeName, targetPrimaryFieldValue, typeInfoORMAPIService]);

  useEffect(() => {
    // TODO: Test this.
    // TODO: List CAN NOT search WITHOUT a Search Button.
    //   (Auto-search is not right with criteria objects that could be empty.)
    if (toMode === TypeNavigationMode.SEARCH_ITEMS && targetTypeName) {
      // TODO: Handle selected fields.
      typeInfoORMAPIService.list(targetTypeName, listItemsConfig);
    }
  }, [toMode, targetTypeName, listItemsConfig, typeInfoORMAPIService]);

  // TODO: Request a new list when the list relationships config changes.
  // TODO: Delete selected items in search items mode.
  // TODO: Delete selected items in related items mode.
  const renderModeContent = (
    content: JSX.Element | undefined,
    loading: boolean,
    loadingLabel: string,
    error?: TypeInfoORMServiceError,
  ): JSX.Element | undefined => {
    if (!content && !loading && !error) {
      return undefined;
    }

    return (
      <ModeContainer>
        {loading ? (
          <LoadingIndicator role="status" aria-live="polite">
            <Spinner aria-hidden="true" />
            <span>{loadingLabel}</span>
          </LoadingIndicator>
        ) : undefined}
        {error ? (
          <ErrorBanner role="alert">
            {typeof error === "string"
              ? error
              : "An unexpected error occurred."}
          </ErrorBanner>
        ) : undefined}
        {content}
      </ModeContainer>
    );
  };

  if (toMode === TypeNavigationMode.FORM) {
    const formContent =
      targetTypeName && targetTypeInfo ? (
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
      ) : undefined;

    return renderModeContent(
      formContent,
      formLoading,
      "Loading form data…",
      formError,
    );
  }

  if (toMode === TypeNavigationMode.SEARCH_ITEMS) {
    const searchContent =
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
      ) : undefined;

    return renderModeContent(
      searchContent,
      searchItemsLoading,
      "Loading search results…",
      searchItemsError,
    );
  }

  if (toMode === TypeNavigationMode.RELATED_ITEMS) {
    const relatedContent =
      targetTypeName && targetTypeInfo ? (
        <ObjectSearch
          operation={toOperation}
          typeInfoMap={typeInfoMap}
          typeInfoName={targetTypeName}
          typeInfo={targetTypeInfo}
          listItemsConfig={listRelationshipsConfig}
          onListItemsConfigChange={onListRelationshipsConfigChange}
          listItemsResults={relatedItemsResults}
          onNavigateToType={onNavigateToType}
          customInputTypeMap={customInputTypeMap}
          selectable={relatedSelectable}
          selectedIndices={relatedSelectedIndices}
          onSelectedIndicesChange={setRelatedSelectedIndices}
          hideSearchControls
        />
      ) : undefined;

    return renderModeContent(
      relatedContent,
      relatedItemsLoading,
      "Loading related items…",
      relatedItemsError,
    );
  }

  return undefined;
};
