import { FC, useCallback, useEffect, useRef } from "react";
import {
  ListItemsConfig,
  ListItemsResults,
  SortField,
} from "../../../../common/SearchTypes";
import { InputComponent, TypeNavigation } from "../Types";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoMap,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";
import { ObjectTable } from "./ObjectSearch/ObjectTable";
import styled from "styled-components";
import {
  PagingControls,
  useCursorCacheController,
} from "./ObjectSearch/PagingControls";
import { SearchControls } from "./ObjectSearch/SearchControls";

const BaseObjectSearch = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;

  & > * {
    flex: 0 0 auto;
  }
`;

export type ObjectSearchProps = {
  operation: TypeOperation;
  typeInfoMap: TypeInfoMap;
  typeInfoName: string;
  typeInfo: TypeInfo;
  listItemsConfig: ListItemsConfig;
  onListItemsConfigChange: (listItemsConfig: ListItemsConfig) => void;
  listItemsResults: ListItemsResults<TypeInfoDataItem>;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  selectable?: boolean;
  selectedIndices?: number[];
  onSelectedIndicesChange?: (selectedIndices: number[]) => void;
  hideSearchControls?: boolean;
};

// TODO: Add item editing UI/buttons to item rows???
export const ObjectSearch: FC<ObjectSearchProps> = ({
  operation,
  typeInfoMap,
  typeInfoName,
  typeInfo,
  listItemsConfig,
  onListItemsConfigChange,
  listItemsResults,
  onNavigateToType,
  customInputTypeMap,
  selectable = false,
  selectedIndices = [],
  onSelectedIndicesChange,
  hideSearchControls = false,
}) => {
  const { tags: { fullPaging = false } = {} } = typeInfo;
  const {
    sortFields,
    cursor: currentCursor,
    criteria: currentCriteria,
  }: Partial<ListItemsConfig> = listItemsConfig || {};
  const {
    cursor: nextCursor,
    items: itemResults = [],
  }: ListItemsResults<TypeInfoDataItem> = listItemsResults;

  // TODO: Changing selected fields should reset everything.
  // Cursor Cache
  const cursorCacheController = useCursorCacheController(
    nextCursor,
    listItemsConfig,
    onListItemsConfigChange,
    // TODO: Need selected fields.
  );

  // Sort Fields
  const onSortFieldsChange = useCallback(
    (newSortFields: SortField[]) => {
      onListItemsConfigChange({
        ...listItemsConfig,
        sortFields: newSortFields,
      });
    },
    [listItemsConfig, onListItemsConfigChange],
  );

  // Effects
  const previousSearchRef = useRef({
    cursor: currentCursor,
    criteria: currentCriteria,
  });
  useEffect(() => {
    const { cursor: previousCursor, criteria: previousCriteria } =
      previousSearchRef.current;
    const cursorChanged = previousCursor !== currentCursor;
    const criteriaChanged = previousCriteria !== currentCriteria;

    if ((cursorChanged || criteriaChanged) && selectedIndices.length > 0) {
      onSelectedIndicesChange?.([]);
    }

    previousSearchRef.current = {
      cursor: currentCursor,
      criteria: currentCriteria,
    };
  }, [
    currentCursor,
    currentCriteria,
    onSelectedIndicesChange,
    selectedIndices.length,
  ]);

  // TODO: Add an interface for selecting exact/specific fields.
  //  Selected Fields are, essentially, a search parameter.
  return (
    <BaseObjectSearch>
      {!hideSearchControls ? (
        <SearchControls
          typeInfoName={typeInfoName}
          typeInfoMap={typeInfoMap}
          operation={operation}
          typeInfo={typeInfo}
          listItemsConfig={listItemsConfig}
          onListItemsConfigChange={onListItemsConfigChange}
          customInputTypeMap={customInputTypeMap}
        />
      ) : undefined}
      <PagingControls
        fullPaging={fullPaging}
        cursorCacheController={cursorCacheController}
        pagingInfo={listItemsConfig}
        listItemsConfig={listItemsConfig}
        onListItemsConfigChange={onListItemsConfigChange}
      />
      <ObjectTable
        typeInfoMap={typeInfoMap}
        typeInfoName={typeInfoName}
        typeInfo={typeInfo}
        sortFields={sortFields}
        onSortFieldsChange={onSortFieldsChange}
        objectList={itemResults}
        selectable={selectable}
        selectedIndices={selectedIndices}
        onSelectedIndicesChange={onSelectedIndicesChange}
        onNavigateToType={onNavigateToType}
      />
      <PagingControls
        fullPaging={fullPaging}
        cursorCacheController={cursorCacheController}
        pagingInfo={listItemsConfig}
        listItemsConfig={listItemsConfig}
        onListItemsConfigChange={onListItemsConfigChange}
      />
    </BaseObjectSearch>
  );
};
