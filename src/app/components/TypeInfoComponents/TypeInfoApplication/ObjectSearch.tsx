import { FC, useCallback, useState } from "react";
import {
  ListItemsConfig,
  ListItemsResults,
  PagingInfo,
  SortField,
} from "../../../../common/SearchTypes";
import { InputComponent, TypeNavigation } from "../Types";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoMap,
} from "../../../../common/TypeParsing/TypeInfo";
import { ObjectTable } from "./ObjectSearch/ObjectTable";
import styled from "styled-components";
import { PagingControls } from "./ObjectSearch/PagingControls";
import { usePagingControls } from "./ObjectSearch/usePagingControls";
import { SearchControls } from "./ObjectSearch/SearchControls";

const BaseObjectSearch = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
`;

export type ObjectSearchProps = {
  typeInfoMap: TypeInfoMap;
  typeInfoName: string;
  typeInfo: TypeInfo;
  listItemsConfig: ListItemsConfig;
  onListItemsConfigChange: (listItemsConfig: ListItemsConfig) => void;
  listItemsResults: ListItemsResults<TypeInfoDataItem>;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  selectable?: boolean;
};

// TODO: Add item editing UI/buttons to item rows???
export const ObjectSearch: FC<ObjectSearchProps> = ({
  typeInfoMap,
  typeInfoName,
  typeInfo,
  listItemsConfig,
  onListItemsConfigChange,
  listItemsResults,
  onNavigateToType,
  customInputTypeMap,
  selectable = false,
}) => {
  const { tags: { fullPaging = false } = {} } = typeInfo;
  const { sortFields }: Partial<ListItemsConfig> = listItemsConfig || {};
  const { items: itemResults = [] }: ListItemsResults<TypeInfoDataItem> =
    listItemsResults;

  // Paging
  const onPagingInfoChange = useCallback(
    (pagingInfo: PagingInfo) => {
      onListItemsConfigChange({
        ...listItemsConfig,
        ...pagingInfo,
      });
    },
    [listItemsConfig, onListItemsConfigChange],
  );
  const pagingControls = usePagingControls(
    fullPaging,
    listItemsConfig as PagingInfo,
    onPagingInfoChange,
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

  // Selected Items
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const onSelectedIndicesChange = useCallback(
    (newSelectedIndices: number[]) => {
      // TODO: Used for managing objects and using them for relationships.
      setSelectedIndices(newSelectedIndices);
    },
    [],
  );

  return (
    <BaseObjectSearch>
      <SearchControls
        typeInfo={typeInfo}
        listItemsConfig={listItemsConfig}
        onListItemsConfigChange={onListItemsConfigChange}
        customInputTypeMap={customInputTypeMap}
      />
      <PagingControls {...pagingControls} />
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
      <PagingControls {...pagingControls} />
    </BaseObjectSearch>
  );
};
