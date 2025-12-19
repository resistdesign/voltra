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
  ListItemsResults,
  ListRelationshipsConfig,
  LogicalOperators,
} from "../../../common/SearchTypes";
import { ObjectSearch } from "./TypeInfoApplication/ObjectSearch";
import { TypeInfoORMAPI } from "../../../common/TypeInfoORM";
import { useTypeInfoORMAPI } from "../../utils/TypeInfoORMAPIUtils";
import { useTypeInfoApplicationState } from "./TypeInfoApplication/TypeInfoApplicationStateUtils";
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
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
  const listRelationshipsResults =
    typeInfoORMAPIState.listRelationships?.data as
      | ListItemsResults<ItemRelationshipInfo>
      | undefined;
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
  const pendingRelationshipMutationsRef = useRef<
    Map<string, "create" | "delete">
  >(new Map());
  const flushPendingRelationshipTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSearchSelectedIndicesRef = useRef<number[]>([]);
  const previousRelatedSelectedIndicesRef = useRef<number[]>([]);
  const suppressSearchSelectionQueueRef = useRef<boolean>(false);
  const suppressRelatedSelectionQueueRef = useRef<boolean>(false);
  useEffect(() => {
    suppressSearchSelectionQueueRef.current = true;
  }, [listItemsConfig]);
  useEffect(() => {
    suppressRelatedSelectionQueueRef.current = true;
  }, [listRelationshipsConfig]);
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
  const selectingRelatedItems = useMemo(
    () =>
      relationshipMode &&
      !!fromTypeName &&
      !!fromTypeFieldName &&
      toMode === TypeNavigationMode.SEARCH_ITEMS,
    [relationshipMode, fromTypeName, fromTypeFieldName, toMode],
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

  const listRelationshipsWithOrigin = useCallback(() => {
    if (!relationshipItemOrigin) {
      return;
    }

    const listRelatedItemsConfig: ListRelationshipsConfig = {
      ...listRelationshipsConfig,
      relationshipItemOrigin,
    };

    typeInfoORMAPIService.listRelationships(listRelatedItemsConfig);
  }, [listRelationshipsConfig, relationshipItemOrigin, typeInfoORMAPIService]);

  const listRelatedDataWithOrigin = useCallback(() => {
    listRelatedItemsWithOrigin();
    listRelationshipsWithOrigin();
  }, [listRelatedItemsWithOrigin, listRelationshipsWithOrigin]);

  const { items: relatedRelationshipsList = [] } =
    listRelationshipsResults ?? { items: [] };
  const relatedRelationshipPrimaryFieldValues = useMemo(() => {
    if (!targetTypePrimaryFieldName) {
      return new Set<string>();
    }

    return new Set(
      relatedRelationshipsList
        .map((relationship) =>
          relationship[ItemRelationshipInfoKeys.toTypePrimaryFieldValue],
        )
        .filter(Boolean)
        .map((value) => `${value}`),
    );
  }, [relatedRelationshipsList, targetTypePrimaryFieldName]);
  const existingRelatedPrimaryFieldValues = useMemo(
    () =>
      new Set(
        relatedRelationshipsList
          .map((relationship) =>
            relationship[ItemRelationshipInfoKeys.toTypePrimaryFieldValue],
          )
          .filter(Boolean)
          .map((value) => `${value}`),
      ),
    [relatedRelationshipsList],
  );
  const flushPendingRelationshipMutations = useCallback(() => {
    if (flushPendingRelationshipTimeoutRef.current) {
      clearTimeout(flushPendingRelationshipTimeoutRef.current);
      flushPendingRelationshipTimeoutRef.current = null;
    }

    if (!relationshipItemOrigin) {
      pendingRelationshipMutationsRef.current.clear();
      return;
    }

    const pendingMutations = Array.from(
      pendingRelationshipMutationsRef.current.entries(),
    );

    if (pendingMutations.length === 0) {
      return;
    }

    pendingRelationshipMutationsRef.current.clear();

    pendingMutations.forEach(([primaryFieldValue, action]) => {
      const relationship = {
        ...relationshipItemOrigin,
        [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: primaryFieldValue,
      };

      if (action === "create") {
        typeInfoORMAPIService.createRelationship(relationship);
      } else {
        typeInfoORMAPIService.deleteRelationship(relationship);
      }
    });

    listRelatedDataWithOrigin();
  }, [
    relationshipItemOrigin,
    listRelatedDataWithOrigin,
    typeInfoORMAPIService,
  ]);
  const scheduleRelationshipMutationFlush = useCallback(() => {
    if (flushPendingRelationshipTimeoutRef.current) {
      clearTimeout(flushPendingRelationshipTimeoutRef.current);
    }

    flushPendingRelationshipTimeoutRef.current = setTimeout(
      () => {
        flushPendingRelationshipMutations();
      },
      250,
    );
  }, [flushPendingRelationshipMutations]);
  const queueRelationshipMutation = useCallback(
    (primaryFieldValue: string, action: "create" | "delete") => {
      if (!relationshipItemOrigin) {
        return;
      }

      const normalizedValue = `${primaryFieldValue}`;
      const pendingMutations = pendingRelationshipMutationsRef.current;

      if (
        action === "delete" &&
        !existingRelatedPrimaryFieldValues.has(normalizedValue) &&
        pendingMutations.get(normalizedValue) !== "create"
      ) {
        return;
      }

      if (!relationshipAllowsMultiple && action === "create") {
        const valuesToClear = new Set<string>([
          ...existingRelatedPrimaryFieldValues,
          ...pendingMutations.keys(),
        ]);

        valuesToClear.forEach((value) => {
          if (value !== normalizedValue) {
            pendingMutations.set(value, "delete");
          }
        });
      }

      pendingMutations.set(normalizedValue, action);
      scheduleRelationshipMutationFlush();
    },
    [
      relationshipItemOrigin,
      existingRelatedPrimaryFieldValues,
      relationshipAllowsMultiple,
      scheduleRelationshipMutationFlush,
    ],
  );

  useEffect(() => {
    const handleBlur = () => {
      flushPendingRelationshipMutations();
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [flushPendingRelationshipMutations]);

  useEffect(() => {
    return () => {
      if (flushPendingRelationshipTimeoutRef.current) {
        clearTimeout(flushPendingRelationshipTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (toMode !== TypeNavigationMode.RELATED_ITEMS) {
      return;
    }

    listRelatedDataWithOrigin();
  }, [toMode, listRelatedDataWithOrigin]);
  useEffect(() => {
    if (!selectingRelatedItems || !relationshipItemOrigin) {
      return;
    }

    listRelationshipsWithOrigin();
  }, [selectingRelatedItems, relationshipItemOrigin, listRelationshipsWithOrigin]);

  const onSubmit = useCallback(
    (newItem: TypeInfoDataItem) => {
      flushPendingRelationshipMutations();
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
      flushPendingRelationshipMutations,
      targetTypeName,
      toOperation,
      typeInfoORMAPIService,
      onCloseCurrentNavHistoryItem,
    ],
  );

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

  const { items: searchItemsList = [] } = searchItemsResults;
  const { items: relatedItemsList = [] } = relatedItemsResults;
  const relatedItemsPrimaryFieldValues = useMemo(
    () =>
      targetTypePrimaryFieldName
        ? relatedItemsList.map((item) => {
            const primaryFieldValue = item?.[targetTypePrimaryFieldName];

            return typeof primaryFieldValue === "undefined" ||
              primaryFieldValue === null
              ? null
              : `${primaryFieldValue}`;
          })
        : [],
    [relatedItemsList, targetTypePrimaryFieldName],
  );
  const relatedRelationshipsKey = useMemo(() => {
    const values = Array.from(relatedRelationshipPrimaryFieldValues).sort();

    return JSON.stringify(values);
  }, [relatedRelationshipPrimaryFieldValues]);
  const relatedItemsPageKey = useMemo(
    () => JSON.stringify(relatedItemsPrimaryFieldValues),
    [relatedItemsPrimaryFieldValues],
  );
  const relatedSelectionKeysRef = useRef({
    relationships: "",
    itemsPage: "",
  });
  const onSelectedIndicesChange = useCallback(
    (indices: number[]) => {
      const nextIndices = relationshipAllowsMultiple ? indices : indices.slice(-1);
      const previousIndices = previousSearchSelectedIndicesRef.current;

      previousSearchSelectedIndicesRef.current = nextIndices;
      setSelectedIndices(nextIndices);

      if (!selectingRelatedItems) {
        return;
      }

      if (suppressSearchSelectionQueueRef.current) {
        suppressSearchSelectionQueueRef.current = false;
        return;
      }

      if (!relationshipItemOrigin || !targetTypePrimaryFieldName) {
        return;
      }

      const addedIndices = nextIndices.filter(
        (index) => !previousIndices.includes(index),
      );
      const removedIndices = previousIndices.filter(
        (index) => !nextIndices.includes(index),
      );

      addedIndices.forEach((index) => {
        const primaryFieldValue =
          searchItemsList[index]?.[targetTypePrimaryFieldName];

        if (
          typeof primaryFieldValue !== "undefined" &&
          primaryFieldValue !== null
        ) {
          queueRelationshipMutation(`${primaryFieldValue}`, "create");
        }
      });

      removedIndices.forEach((index) => {
        const primaryFieldValue =
          searchItemsList[index]?.[targetTypePrimaryFieldName];

        if (
          typeof primaryFieldValue !== "undefined" &&
          primaryFieldValue !== null
        ) {
          queueRelationshipMutation(`${primaryFieldValue}`, "delete");
        }
      });
    },
    [
      relationshipAllowsMultiple,
      selectingRelatedItems,
      relationshipItemOrigin,
      targetTypePrimaryFieldName,
      searchItemsList,
      queueRelationshipMutation,
    ],
  );
  const onRelatedSelectedIndicesChange = useCallback(
    (indices: number[]) => {
      const nextIndices = relationshipAllowsMultiple ? indices : indices.slice(-1);
      const previousIndices = previousRelatedSelectedIndicesRef.current;

      previousRelatedSelectedIndicesRef.current = nextIndices;
      setRelatedSelectedIndices(nextIndices);

      if (!relationshipMode) {
        return;
      }

      if (suppressRelatedSelectionQueueRef.current) {
        suppressRelatedSelectionQueueRef.current = false;
        return;
      }

      if (!relationshipItemOrigin || !targetTypePrimaryFieldName) {
        return;
      }

      const addedIndices = nextIndices.filter(
        (index) => !previousIndices.includes(index),
      );
      const removedIndices = previousIndices.filter(
        (index) => !nextIndices.includes(index),
      );

      addedIndices.forEach((index) => {
        const primaryFieldValue =
          relatedItemsList[index]?.[targetTypePrimaryFieldName];

        if (
          typeof primaryFieldValue !== "undefined" &&
          primaryFieldValue !== null
        ) {
          queueRelationshipMutation(`${primaryFieldValue}`, "create");
        }
      });

      removedIndices.forEach((index) => {
        const primaryFieldValue =
          relatedItemsList[index]?.[targetTypePrimaryFieldName];

        if (
          typeof primaryFieldValue !== "undefined" &&
          primaryFieldValue !== null
        ) {
          queueRelationshipMutation(`${primaryFieldValue}`, "delete");
        }
      });
    },
    [
      relationshipAllowsMultiple,
      relationshipMode,
      relationshipItemOrigin,
      targetTypePrimaryFieldName,
      relatedItemsList,
      queueRelationshipMutation,
    ],
  );
  useEffect(() => {
    if (
      !relationshipMode ||
      toMode !== TypeNavigationMode.RELATED_ITEMS ||
      !targetTypePrimaryFieldName
    ) {
      return;
    }

    const selectionKeysUnchanged =
      relatedSelectionKeysRef.current.relationships ===
        relatedRelationshipsKey &&
      relatedSelectionKeysRef.current.itemsPage === relatedItemsPageKey;

    if (selectionKeysUnchanged) {
      return;
    }

    relatedSelectionKeysRef.current = {
      relationships: relatedRelationshipsKey,
      itemsPage: relatedItemsPageKey,
    };
    const selectedIndices = relatedItemsList.reduce<number[]>(
      (accumulator, item, index) => {
        const primaryFieldValue = item?.[targetTypePrimaryFieldName];

        if (
          typeof primaryFieldValue !== "undefined" &&
          primaryFieldValue !== null &&
          relatedRelationshipPrimaryFieldValues.has(`${primaryFieldValue}`)
        ) {
          accumulator.push(index);
        }

        return accumulator;
      },
      [],
    );
    const nextSelectedIndices = relationshipAllowsMultiple
      ? selectedIndices
      : selectedIndices.slice(0, 1);

    setRelatedSelectedIndices((prevSelectedIndices) => {
      const matches =
        prevSelectedIndices.length === nextSelectedIndices.length &&
        prevSelectedIndices.every(
          (value, index) => value === nextSelectedIndices[index],
        );

      return matches ? prevSelectedIndices : nextSelectedIndices;
    });
  }, [
    relationshipMode,
    toMode,
    targetTypePrimaryFieldName,
    relatedRelationshipPrimaryFieldValues,
    relatedItemsList,
    relationshipAllowsMultiple,
    relatedRelationshipsKey,
    relatedItemsPageKey,
  ]);
  const selectedRelatedItems = useMemo<Partial<TypeInfoDataItem>[]>(
    () =>
      relatedSelectedIndices
        .map((index) => relatedItemsList[index])
        .filter(Boolean),
    [relatedSelectedIndices, relatedItemsList],
  );
  const selectedSearchRelationships = useMemo<BaseItemRelationshipInfo[]>(
    () => {
      if (
        !selectingRelatedItems ||
        !fromTypeFieldName ||
        !targetTypePrimaryFieldName ||
        !relationshipItemOrigin
      ) {
        return [];
      }

      const originTypeName =
        relationshipItemOrigin[ItemRelationshipInfoKeys.fromTypeName];
      const originFieldName =
        relationshipItemOrigin[ItemRelationshipInfoKeys.fromTypeFieldName];
      const originPrimaryFieldValue =
        relationshipItemOrigin[ItemRelationshipInfoKeys.fromTypePrimaryFieldValue];

      if (!originTypeName || !originFieldName || !originPrimaryFieldValue) {
        return [];
      }

      const getRelationshipItem = (
        primaryFieldValue: Partial<TypeInfoDataItem>[keyof TypeInfoDataItem],
      ): BaseItemRelationshipInfo | undefined => {
        if (typeof primaryFieldValue === "undefined" || primaryFieldValue === null) {
          return undefined;
        }

        return {
          [ItemRelationshipInfoKeys.fromTypeName]: originTypeName,
          [ItemRelationshipInfoKeys.fromTypeFieldName]: originFieldName,
          [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]: `${originPrimaryFieldValue}`,
          [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: `${primaryFieldValue}`,
        };
      };

      const relationships = selectedIndices
        .map((index) => searchItemsList[index])
        .map((item) => item?.[targetTypePrimaryFieldName])
        .map(getRelationshipItem)
        .filter(Boolean) as BaseItemRelationshipInfo[];

      return relationshipAllowsMultiple
        ? relationships
        : relationships.slice(0, 1);
    },
    [
      selectingRelatedItems,
      fromTypeFieldName,
      targetTypePrimaryFieldName,
      relationshipItemOrigin,
      selectedIndices,
      searchItemsList,
      relationshipAllowsMultiple,
    ],
  );
  const canAddRelatedItems = useMemo<boolean>(
    () => selectingRelatedItems && selectedSearchRelationships.length > 0,
    [selectingRelatedItems, selectedSearchRelationships],
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
  const onAddRelatedRelationships = useCallback(() => {
    if (!canAddRelatedItems || selectedSearchRelationships.length === 0) {
      return;
    }

    selectedSearchRelationships.forEach((relationshipItem) => {
      const primaryFieldValue =
        relationshipItem[ItemRelationshipInfoKeys.toTypePrimaryFieldValue];

      if (
        typeof primaryFieldValue !== "undefined" &&
        primaryFieldValue !== null
      ) {
        queueRelationshipMutation(`${primaryFieldValue}`, "create");
      }
    });

    flushPendingRelationshipMutations();
    setSelectedIndices([]);
  }, [
    canAddRelatedItems,
    selectedSearchRelationships,
    queueRelationshipMutation,
    flushPendingRelationshipMutations,
  ]);
  const onDeleteRelationships = useCallback(() => {
    if (!relationshipItemOrigin || !canDeleteRelationships) {
      return;
    }

    const relatedPrimaryValues = relationshipAllowsMultiple
      ? selectedRelatedPrimaryFieldValues
      : selectedRelatedPrimaryFieldValues.slice(0, 1);

    relatedPrimaryValues.forEach((relatedPrimaryValue) => {
      queueRelationshipMutation(`${relatedPrimaryValue}`, "delete");
    });

    flushPendingRelationshipMutations();
    setRelatedSelectedIndices([]);
  }, [
    relationshipItemOrigin,
    canDeleteRelationships,
    relationshipAllowsMultiple,
    selectedRelatedPrimaryFieldValues,
    queueRelationshipMutation,
    flushPendingRelationshipMutations,
  ]);
  const onCloseWithFlush = useCallback(() => {
    flushPendingRelationshipMutations();
    onCloseCurrentNavHistoryItem();
  }, [flushPendingRelationshipMutations, onCloseCurrentNavHistoryItem]);
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
      listRelatedDataWithOrigin();
      setRelatedSelectedIndices([]);
    }

    createRelationshipLoadingRef.current = !!createRelationshipLoading;
    deleteRelationshipLoadingRef.current = !!deleteRelationshipLoading;
  }, [
    relationshipMode,
    createRelationshipLoading,
    deleteRelationshipLoading,
    listRelatedDataWithOrigin,
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
          onCancel={onCloseWithFlush}
          onSubmit={onSubmit}
          onNavigateToType={onNavigateToType}
        />,
        { loading: formLoading, error: formError },
      )
    : toMode === TypeNavigationMode.SEARCH_ITEMS
      ? renderWithFeedback(
          targetTypeName && targetTypeInfo ? (
            <>
              {selectingRelatedItems ? (
                <ActionsBar>
                  <IndexButton
                    type="button"
                    disabled={!canAddRelatedItems}
                    onClick={onAddRelatedRelationships}
                  >
                    Add related
                  </IndexButton>
                  <IndexButton
                    type="button"
                    onClick={onCloseWithFlush}
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
