import { FC, JSX, useCallback, useEffect, useMemo, useState } from "react";
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
import { TypeInfoORMAPI } from "../../../common/TypeInfoORM";
import { useTypeInfoORMAPI } from "../../utils/TypeInfoORMAPIUtils";
import { useTypeInfoApplicationState } from "./TypeInfoApplication/TypeInfoApplicationStateUtils";
import {
  ItemRelationshipInfoKeys,
  ItemRelationshipOriginItemInfo,
} from "../../../common/ItemRelationshipInfoTypes";

const ModeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75em;
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Spinner = styled.span`
  width: 1em;
  height: 1em;
  border-radius: 50%;
  border: 0.15em solid currentColor;
  border-top-color: transparent;
  display: inline-block;
  animation: ${spin} 1s linear infinite;
`;

const LoadingNotice = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  color: #666666;
  font-size: 0.9em;
`;

const ErrorBanner = styled.div`
  padding: 0.75em 1em;
  border-radius: 8px;
  border: 1px solid #f6cacc;
  background-color: #fff5f5;
  color: #6f1d1f;
  font-size: 0.95em;
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
    fromTypePrimaryFieldValue,
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

  const selectedFields = useMemo<(keyof TypeInfoDataItem)[] | undefined>(
    () =>
      (
        targetTypeInfo as
          | (TypeInfo & { selectedFields?: (keyof TypeInfoDataItem)[] })
          | undefined
      )?.selectedFields,
    [targetTypeInfo],
  );

  useEffect(() => {
    if (
      toMode !== TypeNavigationMode.RELATED_ITEMS ||
      !fromTypeName ||
      !fromTypeFieldName
    ) {
      return;
    }

    const relationshipItemOrigin: ItemRelationshipOriginItemInfo = {
      [ItemRelationshipInfoKeys.fromTypeName]: fromTypeName,
      [ItemRelationshipInfoKeys.fromTypeFieldName]: fromTypeFieldName,
      [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]:
        targetPrimaryFieldValue ?? fromTypePrimaryFieldValue,
    };

    if (
      !relationshipItemOrigin[
        ItemRelationshipInfoKeys.fromTypePrimaryFieldValue
      ]
    ) {
      return;
    }

    setListRelationshipsConfig((prevConfig) => {
      const originsMatch = Object.entries(relationshipItemOrigin).every(
        ([key, value]) =>
          prevConfig.relationshipItemOrigin[
            key as keyof ItemRelationshipOriginItemInfo
          ] === value,
      );
      const nextConfig = {
        ...prevConfig,
        relationshipItemOrigin,
      };

      return originsMatch ? prevConfig : nextConfig;
    });

    const listRelatedItemsConfig: ListRelationshipsConfig = {
      ...listRelationshipsConfig,
      relationshipItemOrigin,
    };

    typeInfoORMAPIService.listRelatedItems(
      listRelatedItemsConfig,
      selectedFields,
    );
  }, [
    toMode,
    fromTypeName,
    fromTypeFieldName,
    fromTypePrimaryFieldValue,
    targetPrimaryFieldValue,
    listRelationshipsConfig,
    typeInfoORMAPIService,
    selectedFields,
  ]);

  // TODO: HOW TO RENDER AND DISMISS ERRORS?
  // TODO: How to handle loading states?
  // TODO: Delete selected items in search items mode.
  // TODO: Delete selected items in related items mode.
  const renderWithFeedback = (
    content: JSX.Element | undefined,
    { loading, error }: { loading?: boolean; error?: unknown },
  ) => {
    if (!content) {
      return undefined;
    }

    const errorMessage =
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : error
            ? String(error)
            : undefined;

    return (
      <ModeContainer>
        {loading ? (
          <LoadingNotice aria-live="polite">
            <Spinner aria-hidden="true" />
            <span>Loading...</span>
          </LoadingNotice>
        ) : undefined}
        {errorMessage ? (
          <ErrorBanner role="alert">{errorMessage}</ErrorBanner>
        ) : undefined}
        {content}
      </ModeContainer>
    );
  };

  return toMode === TypeNavigationMode.FORM
    ? renderWithFeedback(
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
        />,
        { loading: formLoading, error: formError },
      )
    : toMode === TypeNavigationMode.SEARCH_ITEMS
      ? renderWithFeedback(
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
          ) : undefined,
          { loading: searchItemsLoading, error: searchItemsError },
        )
      : toMode === TypeNavigationMode.RELATED_ITEMS
        ? renderWithFeedback(
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
            ) : undefined,
            { loading: relatedItemsLoading, error: relatedItemsError },
          )
        : undefined;
};
