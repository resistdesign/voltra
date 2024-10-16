import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ComparisonOperators,
  FieldCriterion,
  ListItemsConfig,
  ListItemsResults,
  ListRelationshipsConfig,
  ListRelationshipsResults,
  LogicalOperators,
  PagingInfo,
  SearchCriteria,
  SortField,
} from "../../../../common/SearchTypes";
import { InputComponent, TypeNavigation } from "../Types";
import {TypeInfo, TypeInfoDataItem, TypeInfoMap} from "../../../../common/TypeParsing/TypeInfo";
import { ObjectTable } from "./ObjectSearch/ObjectTable";
import styled from "styled-components";
import { FieldCriterionControl } from "./ObjectSearch/FieldCriterionControl";
import { IndexButton } from "../../Basic/IndexButton";
import { PagingControls } from "./ObjectSearch/PagingControls";
import { usePagingControls } from "./ObjectSearch/usePagingControls";
import { MaterialSymbol } from "../../MaterialSymbol";

const BaseObjectSearch = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
`;
const Controls = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
`;
const FieldCriterionControlItem = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
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
  listRelationshipsConfig: ListRelationshipsConfig;
  onListRelationshipsConfigChange: (
    listRelationshipsConfig: ListRelationshipsConfig,
  ) => void;
  listRelationshipsResults: ListRelationshipsResults;
  // TODO: CRUD ops for relationships.
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
  // TODO: Handle loading and displaying relationships.
  listRelationshipsConfig,
  onListRelationshipsConfigChange,
  listRelationshipsResults,
  onNavigateToType,
  customInputTypeMap,
  selectable = false,
}) => {
  const {
    sortFields,
    criteria: searchCriteria = {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [],
    },
  }: Partial<ListItemsConfig> = listItemsConfig || {};
  const { logicalOperator = LogicalOperators.AND, fieldCriteria = [] } =
    searchCriteria;
  const {
    cursor: nextPagingCursor,
    items: itemResults = [],
  }: ListItemsResults<TypeInfoDataItem> = listItemsResults;
  const onPatchListItemsConfig = useCallback(
    (patch: Partial<ListItemsConfig>) => {
      // TODO: >>>IMPORTANT<<<: When should the cursor be reset/removed?
      onListItemsConfigChange({
        ...listItemsConfig,
        ...patch,
      });
    },
    [listItemsConfig, onListItemsConfigChange],
  );
  const onSortFieldsChange = useCallback(
    (newSortFields: SortField[]) => {
      onPatchListItemsConfig({
        sortFields: newSortFields,
      });
    },
    [onPatchListItemsConfig],
  );
  const onPatchSearchCriteria = useCallback(
    (newSearchCriteria: Partial<SearchCriteria>) => {
      onPatchListItemsConfig({
        criteria: {
          ...searchCriteria,
          ...newSearchCriteria,
        },
      });
    },
    [searchCriteria, onPatchListItemsConfig],
  );
  const onFieldCriterionChange = useCallback(
    (index: number, newFieldCriterion: FieldCriterion) => {
      const newFieldCriteria = [...fieldCriteria].map(
        (fieldCriterionItem, fieldCriterionIndex) =>
          fieldCriterionIndex === index
            ? newFieldCriterion
            : fieldCriterionItem,
      );

      onPatchSearchCriteria({
        fieldCriteria: newFieldCriteria,
      });
    },
    [fieldCriteria, onPatchSearchCriteria],
  );
  const onLogicalOperatorChange = useCallback(
    (event: ReactChangeEvent<HTMLSelectElement>) => {
      const newLogicalOperator = event.target.value as LogicalOperators;

      onPatchSearchCriteria({
        logicalOperator: newLogicalOperator,
      });
    },
    [onPatchSearchCriteria],
  );
  const logicalOperatorOptions = useMemo(
    () => Object.values(LogicalOperators),
    [],
  );
  const onAddCriterion = useCallback(() => {
    onPatchSearchCriteria({
      fieldCriteria: [
        ...fieldCriteria,
        {
          fieldName: "",
          operator: ComparisonOperators.EQUALS,
          value: "",
        },
      ],
    });
  }, [fieldCriteria, onPatchSearchCriteria]);
  const onRemoveCriterion = useCallback(
    (index: number) => {
      const newFieldCriteria = [...fieldCriteria].filter(
        (_, fieldCriterionIndex) => fieldCriterionIndex !== index,
      );

      onPatchSearchCriteria({
        fieldCriteria: newFieldCriteria,
      });
    },
    [fieldCriteria, onPatchSearchCriteria],
  );
  const { tags: { fullPaging } = {} } = typeInfo;
  const onPagingInfoChange = useCallback(
    (pagingInfo: PagingInfo) => {
      onPatchListItemsConfig({
        ...pagingInfo,
      });
    },
    [onPatchListItemsConfig],
  );
  const pagingControls = usePagingControls(
    listItemsConfig as PagingInfo,
    onPagingInfoChange,
  );
  const onLoadMore = useCallback(() => {
    onPatchListItemsConfig({
      cursor: nextPagingCursor,
    });
  }, [nextPagingCursor, onPatchListItemsConfig]);
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
      <Controls>
        <select value={logicalOperator} onChange={onLogicalOperatorChange}>
          <option value="">Logical Operator</option>
          {logicalOperatorOptions.map((operator) => (
            <option key={operator} value={operator}>
              {operator}
            </option>
          ))}
        </select>
        {fieldCriteria.map((fieldCriterionItem, index) => (
          <FieldCriterionControlItem key={`FieldCriterionControlItem:${index}`}>
            <FieldCriterionControl
              key={`TypeInfoInput:${index}`}
              index={index}
              fieldCriterion={fieldCriterionItem}
              typeInfo={typeInfo}
              onChange={onFieldCriterionChange}
              customInputTypeMap={customInputTypeMap}
            />
            <IndexButton index={index} onClick={onRemoveCriterion}>
              Remove Criterion
            </IndexButton>
          </FieldCriterionControlItem>
        ))}
        <button onClick={onAddCriterion}>Add Criterion</button>
      </Controls>
      {fullPaging ? <PagingControls {...pagingControls} /> : undefined}
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
      {fullPaging ? (
        <PagingControls {...pagingControls} />
      ) : (
        <button onClick={onLoadMore}>
          <MaterialSymbol>expand_circle_down</MaterialSymbol>
        </button>
      )}
    </BaseObjectSearch>
  );
};
