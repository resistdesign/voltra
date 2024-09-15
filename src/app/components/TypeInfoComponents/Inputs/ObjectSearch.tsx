import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useMemo,
} from "react";
import {
  ComparisonOperators,
  FieldCriterion,
  ListItemResults,
  ListItemsConfig,
  LogicalOperators,
  MultiRelationshipCheckConfig,
  MultiRelationshipCheckResultsMap,
  PagingInfo,
  SearchCriteria,
  SortField,
} from "../../../../common/SearchTypes";
import { InputComponent, TypeInfoDataItem, TypeNavigation } from "../Types";
import {
  TypeInfo,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";
import { ObjectTable } from "./ObjectTable";
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
  typeInfoName: string;
  typeInfo: TypeInfo;
  // TODO: Relationship Check. (Selected Items)
  relationshipCheckConfig?: MultiRelationshipCheckConfig;
  onRelationshipCheckConfigChange?: (
    relationshipCheckConfig: MultiRelationshipCheckConfig,
  ) => void;
  relationshipCheckResults?: MultiRelationshipCheckResultsMap;
  // TODO: Load relationships. ("Selections")
  // TODO: Selected items VS results.
  // TODO: IMPORTANT: Paging.
  listItemConfig: ListItemsConfig;
  onListItemConfigChange: (listItemsConfig: ListItemsConfig) => void;
  listItemResults: ListItemResults<TypeInfoDataItem>;
  operation?: TypeOperation;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
};

export const ObjectSearch: FC<ObjectSearchProps> = ({
  typeInfoName,
  typeInfo,
  // TODO: Use these:
  relationshipCheckConfig,
  onRelationshipCheckConfigChange,
  relationshipCheckResults,
  listItemConfig,
  onListItemConfigChange,
  listItemResults,
  operation,
  onNavigateToType,
  customInputTypeMap,
}) => {
  const {
    sortFields,
    criteria: searchCriteria = {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [],
    },
  }: Partial<ListItemsConfig> = listItemConfig || {};
  const { logicalOperator = LogicalOperators.AND, fieldCriteria = [] } =
    searchCriteria;
  const {
    cursor: nextPagingCursor,
    items: itemResults = [],
  }: ListItemResults<TypeInfoDataItem> = listItemResults;
  const onPatchListItemsConfig = useCallback(
    (patch: Partial<ListItemsConfig>) => {
      // TODO: When should the cursor be reset/removed?
      onListItemConfigChange({
        ...listItemConfig,
        ...patch,
      });
    },
    [listItemConfig, onListItemConfigChange],
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
    listItemConfig as PagingInfo,
    onPagingInfoChange,
  );
  const onLoadMore = useCallback(() => {
    onPatchListItemsConfig({
      cursor: nextPagingCursor,
    });
  }, [nextPagingCursor, onPatchListItemsConfig]);

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
        typeInfoName={typeInfoName}
        typeInfo={typeInfo}
        sortFields={sortFields}
        onSortFieldsChange={onSortFieldsChange}
        objectList={itemResults}
        selectable={true /* TODO: What should this be? */}
        selectedIndices={[] /* TODO: What should this be? */}
        onSelectedIndicesChange={
          () => undefined /* TODO: What should this be? */
        }
        operation={operation}
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
