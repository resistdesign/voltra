import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
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
import { TypeInfo, TypeInfoMap } from "../../../../common/TypeParsing/TypeInfo";
import { ObjectTable } from "./ObjectSearch/ObjectTable";
import styled from "styled-components";
import { FieldCriterionControl } from "./ObjectSearch/FieldCriterionControl";
import { IndexButton } from "../../Basic/IndexButton";
import { PagingControls } from "./ObjectSearch/PagingControls";
import { usePagingControls } from "./ObjectSearch/usePagingControls";
import { MaterialSymbol } from "../../MaterialSymbol";
import { getSelectedIndices } from "../../../../common/ItemDataSelectionUtils";

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
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  selectable?: boolean;
};

// TODO: Add item editing UI/buttons to item rows???
export const ObjectSearch: FC<ObjectSearchProps> = ({
  typeInfoMap,
  typeInfoName,
  typeInfo,
  // TODO: Use these:
  relationshipCheckConfig,
  onRelationshipCheckConfigChange,
  relationshipCheckResults,
  listItemConfig,
  onListItemConfigChange,
  listItemResults,
  onNavigateToType,
  customInputTypeMap,
  selectable = false,
}) => {
  const { primaryField } = typeInfo;
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
  const selectedIndicesFromRelationShipCheckResults = useMemo(
    () =>
      primaryField && relationshipCheckResults
        ? getSelectedIndices(
            itemResults,
            relationshipCheckResults,
            primaryField,
          )
        : [],
    [itemResults, relationshipCheckResults, primaryField],
  );
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    selectedIndicesFromRelationShipCheckResults,
  );
  const onSelectedIndicesChange = useCallback(
    (newSelectedIndices: number[]) => {
      // TODO: Needs to be converted to update actions.
      //  - Accumulate and submit changes? (Seems impossible to do this with paging at play.)
      //    - Maybe maintain an internal version of the relationship check results?
      //      - Then, when the user is done, they can submit the changes.
      setSelectedIndices(newSelectedIndices);
    },
    [],
  );

  useEffect(
    () => setSelectedIndices(selectedIndicesFromRelationShipCheckResults),
    [selectedIndicesFromRelationShipCheckResults],
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
