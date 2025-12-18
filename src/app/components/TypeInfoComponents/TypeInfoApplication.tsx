import {
  FC,
  JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled, { keyframes } from "styled-components";
import { TypeInfoForm } from "./TypeInfoApplication/TypeInfoForm";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoField,
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
import { IndexButton } from "../Basic/IndexButton";

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

const ActionsBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  align-items: center;
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
  const relationshipFieldInfo = useMemo<TypeInfoField | undefined>(() => {
    if (!relationshipMode || !fromTypeFieldName) {
      return undefined;
    }

    const { fields = {} } = typeInfoMap[fromTypeName] ?? {};

    return fields[fromTypeFieldName];
  }, [relationshipMode, fromTypeFieldName, fromTypeName, typeInfoMap]);
  const relationshipAllowsMultiple = useMemo<boolean>(
    () => relationshipFieldInfo?.array ?? false,
    [relationshipFieldInfo],
  );
  const { targetTypeName, targetTypeInfo } = useTypeInfoState({
    typeInfoMap,
    relationshipMode,
    fromTypeName,
    fromTypeFieldName,
  });
  const targetTypePrimaryFieldName = useMemo<string | undefined>(
    () => targetTypeInfo?.primaryField,
    [targetTypeInfo],
  );
  const relationshipItemOrigin = useMemo<
    ItemRelationshipOriginItemInfo | undefined
  >(() => {
    if (!relationshipMode || !fromTypeFieldName) {
      return undefined;
    }

    const primaryFieldValue =
      targetPrimaryFieldValue ?? fromTypePrimaryFieldValue;

    if (!primaryFieldValue) {
      return undefined;
    }

    return {
      [ItemRelationshipInfoKeys.fromTypeName]: fromTypeName,
      [ItemRelationshipInfoKeys.fromTypeFieldName]: fromTypeFieldName,
      [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]: primaryFieldValue,
    };
  }, [
    relationshipMode,
    fromTypeFieldName,
    fromTypeName,
    targetPrimaryFieldValue,
    fromTypePrimaryFieldValue,
  ]);
  const onListRelationshipsConfigChange = useCallback(
    ({ cursor, itemsPerPage }: ListItemsConfig) => {
      if (relationshipItemOrigin) {
        setListRelationshipsConfig({
          cursor,
          itemsPerPage,
          relationshipItemOrigin,
        });
      }
    },
    [relationshipItemOrigin],
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
    if (relationshipMode) {
      const selectionEnabled = !!relationshipFieldInfo;

      setSelectable(selectionEnabled);
      setRelatedSelectable(selectionEnabled);

      if (!relationshipAllowsMultiple) {
        setSelectedIndices((prevSelectedIndices) =>
          prevSelectedIndices.length > 0
            ? prevSelectedIndices.slice(-1)
            : prevSelectedIndices,
        );
        setRelatedSelectedIndices((prevSelectedIndices) =>
          prevSelectedIndices.length > 0
            ? prevSelectedIndices.slice(-1)
            : prevSelectedIndices,
        );
      }
    } else {
      setSelectable(true);
      setRelatedSelectable(true);
    }
  }, [relationshipMode, relationshipFieldInfo, relationshipAllowsMultiple]);

  useEffect(() => {
    if (!relationshipItemOrigin) {
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
  }, [relationshipItemOrigin]);

  const listRelatedItemsWithOrigin = useCallback(() => {
    if (!relationshipItemOrigin) {
      return;
    }

    const listRelatedItemsConfig: ListRelationshipsConfig = {
      ...listRelationshipsConfig,
      relationshipItemOrigin,
    };

    typeInfoORMAPIService.listRelatedItems(
      listRelatedItemsConfig,
      selectedFields,
    );
  }, [
    listRelationshipsConfig,
    relationshipItemOrigin,
    selectedFields,
    typeInfoORMAPIService,
  ]);

  useEffect(() => {
    if (toMode !== TypeNavigationMode.RELATED_ITEMS) {
      return;
    }

    listRelatedItemsWithOrigin();
  }, [toMode, listRelatedItemsWithOrigin]);

  // TODO: HOW TO RENDER AND DISMISS ERRORS?
  // TODO: How to handle loading states?
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

  const onSelectedIndicesChange = useCallback(
    (indices: number[]) => {
      setSelectedIndices(
        relationshipAllowsMultiple ? indices : indices.slice(-1),
      );
    },
    [relationshipAllowsMultiple],
  );
  const onRelatedSelectedIndicesChange = useCallback(
    (indices: number[]) => {
      setRelatedSelectedIndices(
        relationshipAllowsMultiple ? indices : indices.slice(-1),
      );
    },
    [relationshipAllowsMultiple],
  );
  const { items: searchItemsList = [] } = searchItemsResults;
  const selectedSearchItems = useMemo<Partial<TypeInfoDataItem>[]>(
    () => selectedIndices.map((index) => searchItemsList[index]).filter(Boolean),
    [selectedIndices, searchItemsList],
  );
  const { items: relatedItemsList = [] } = relatedItemsResults;
  const selectedRelatedItems = useMemo<Partial<TypeInfoDataItem>[]>(
    () =>
      relatedSelectedIndices
        .map((index) => relatedItemsList[index])
        .filter(Boolean),
    [relatedSelectedIndices, relatedItemsList],
  );
  const selectedSearchPrimaryFieldValues = useMemo<string[]>(
    () =>
      relationshipMode && targetTypePrimaryFieldName
        ? selectedSearchItems
            .map((item) => item[targetTypePrimaryFieldName])
            .filter((value) => typeof value !== "undefined" && value !== null)
            .map((value) => `${value}`)
        : [],
    [relationshipMode, targetTypePrimaryFieldName, selectedSearchItems],
  );
  const selectedRelatedPrimaryFieldValues = useMemo<string[]>(
    () =>
      relationshipMode && targetTypePrimaryFieldName
        ? selectedRelatedItems
            .map((item) => item[targetTypePrimaryFieldName])
            .filter((value) => typeof value !== "undefined" && value !== null)
            .map((value) => `${value}`)
        : [],
    [relationshipMode, targetTypePrimaryFieldName, selectedRelatedItems],
  );
  const canCreateRelationships = useMemo<boolean>(
    () =>
      relationshipMode &&
      !!relationshipItemOrigin?.[ItemRelationshipInfoKeys.fromTypePrimaryFieldValue] &&
      !!targetTypePrimaryFieldName &&
      selectedSearchPrimaryFieldValues.length > 0,
    [
      relationshipMode,
      relationshipItemOrigin,
      selectedSearchPrimaryFieldValues,
      targetTypePrimaryFieldName,
    ],
  );
  const canDeleteRelationships = useMemo<boolean>(
    () =>
      relationshipMode &&
      !!relationshipItemOrigin?.[ItemRelationshipInfoKeys.fromTypePrimaryFieldValue] &&
      !!targetTypePrimaryFieldName &&
      selectedRelatedPrimaryFieldValues.length > 0,
    [
      relationshipMode,
      relationshipItemOrigin,
      selectedRelatedPrimaryFieldValues,
      targetTypePrimaryFieldName,
    ],
  );
  const onCreateRelationships = useCallback(() => {
    if (!relationshipItemOrigin || !canCreateRelationships) {
      return;
    }

    const relatedPrimaryValues = relationshipAllowsMultiple
      ? selectedSearchPrimaryFieldValues
      : selectedSearchPrimaryFieldValues.slice(0, 1);

    relatedPrimaryValues.forEach((relatedPrimaryValue) => {
      typeInfoORMAPIService.createRelationship({
        ...relationshipItemOrigin,
        [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: relatedPrimaryValue,
      });
    });

    setSelectedIndices([]);
  }, [
    relationshipItemOrigin,
    canCreateRelationships,
    relationshipAllowsMultiple,
    selectedSearchPrimaryFieldValues,
    typeInfoORMAPIService,
  ]);
  const onDeleteRelationships = useCallback(() => {
    if (!relationshipItemOrigin || !canDeleteRelationships) {
      return;
    }

    const relatedPrimaryValues = relationshipAllowsMultiple
      ? selectedRelatedPrimaryFieldValues
      : selectedRelatedPrimaryFieldValues.slice(0, 1);

    relatedPrimaryValues.forEach((relatedPrimaryValue) => {
      typeInfoORMAPIService.deleteRelationship({
        ...relationshipItemOrigin,
        [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: relatedPrimaryValue,
      });
    });

    setRelatedSelectedIndices([]);
  }, [
    relationshipItemOrigin,
    canDeleteRelationships,
    relationshipAllowsMultiple,
    selectedRelatedPrimaryFieldValues,
    typeInfoORMAPIService,
  ]);
  const onNavigateToSearchMode = useCallback(() => {
    if (!relationshipItemOrigin || !relationshipMode || !fromTypeFieldName) {
      return;
    }

    onNavigateToType({
      fromTypeName,
      fromTypeFieldName,
      fromTypePrimaryFieldValue:
        relationshipItemOrigin[ItemRelationshipInfoKeys.fromTypePrimaryFieldValue],
      toOperation,
      toMode: TypeNavigationMode.SEARCH_ITEMS,
    });
  }, [
    relationshipItemOrigin,
    relationshipMode,
    fromTypeFieldName,
    fromTypeName,
    onNavigateToType,
    toOperation,
  ]);
  const createRelationshipLoadingRef = useRef<boolean>();
  const deleteRelationshipLoadingRef = useRef<boolean>();
  const createRelationshipLoading = typeInfoORMAPIState.createRelationship?.loading;
  const deleteRelationshipLoading = typeInfoORMAPIState.deleteRelationship?.loading;

  useEffect(() => {
    const createFinished =
      createRelationshipLoadingRef.current && !createRelationshipLoading;
    const deleteFinished =
      deleteRelationshipLoadingRef.current && !deleteRelationshipLoading;

    if (relationshipMode && (createFinished || deleteFinished)) {
      listRelatedItemsWithOrigin();
      setRelatedSelectedIndices([]);
    }

    createRelationshipLoadingRef.current = !!createRelationshipLoading;
    deleteRelationshipLoadingRef.current = !!deleteRelationshipLoading;
  }, [
    relationshipMode,
    createRelationshipLoading,
    deleteRelationshipLoading,
    listRelatedItemsWithOrigin,
  ]);

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
            <>
              {relationshipMode ? (
                <ActionsBar>
                  <IndexButton
                    type="button"
                    disabled={!canCreateRelationships}
                    onClick={onCreateRelationships}
                  >
                    Relate selected
                  </IndexButton>
                  <IndexButton
                    type="button"
                    onClick={onCloseCurrentNavHistoryItem}
                  >
                    Back
                  </IndexButton>
                </ActionsBar>
              ) : undefined}
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
                onSelectedIndicesChange={onSelectedIndicesChange}
              />
            </>
          ) : undefined,
          { loading: searchItemsLoading, error: searchItemsError },
        )
      : toMode === TypeNavigationMode.RELATED_ITEMS
        ? renderWithFeedback(
            targetTypeName && targetTypeInfo ? (
              <>
                {relationshipMode ? (
                  <ActionsBar>
                    <IndexButton type="button" onClick={onNavigateToSearchMode}>
                      Add related
                    </IndexButton>
                    <IndexButton
                      type="button"
                      disabled={!canDeleteRelationships}
                      onClick={onDeleteRelationships}
                    >
                      Remove selected
                    </IndexButton>
                  </ActionsBar>
                ) : undefined}
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
                  onSelectedIndicesChange={onRelatedSelectedIndicesChange}
                  hideSearchControls={!relationshipMode}
                />
              </>
            ) : undefined,
            { loading: relatedItemsLoading, error: relatedItemsError },
          )
        : undefined;
};
