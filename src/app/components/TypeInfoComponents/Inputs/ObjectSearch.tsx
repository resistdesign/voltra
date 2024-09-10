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
  SearchCriteria,
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
  // TODO: Load relationships. ("Selections")
  // TODO: Selected items VS results.
  // TODO: IMPORTANT: Paging.
  listItemsConfig: ListItemsConfig;
  selectedItemResults?: ListItemResults<TypeInfoDataItem>;
  onListItemsConfigChange: (listItemsConfig: ListItemsConfig) => void;
  listItemResults: ListItemResults<TypeInfoDataItem>;
  operation?: TypeOperation;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
};

export const ObjectSearch: FC<ObjectSearchProps> = ({
  typeInfoName,
  typeInfo,
  listItemsConfig,
  onListItemsConfigChange,
  listItemResults,
  selectedItemResults,
  operation,
  onNavigateToType,
  customInputTypeMap,
}) => {
  const {
    criteria: searchCriteria = {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [],
    },
  }: Partial<ListItemsConfig> = listItemsConfig || {};
  const { logicalOperator = LogicalOperators.AND, fieldCriteria = [] } =
    searchCriteria;
  const {
    // TODO: Paging.
    // TODO: Change Paging.
    cursor: pagingCursor,
    items: itemResults = [],
  }: ListItemResults<TypeInfoDataItem> = listItemResults;
  // TODO: Paging.
  // TODO: Change Paging.
  const {
    items: selectedResults = [],
  }: Partial<ListItemResults<TypeInfoDataItem>> = selectedItemResults || {};
  const onPatchListItemsConfig = useCallback(
    (patch: Partial<ListItemsConfig>) => {
      onListItemsConfigChange({
        ...listItemsConfig,
        ...patch,
      });
    },
    [listItemsConfig, onListItemsConfigChange],
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
      <PagingControls
        fullPaging={fullPaging}
        pagingCursor={pagingCursor}
        onFirst={onFirst}
        onPrevious={onPrevious}
        onPageNumber={onPageNumber}
        onNext={onNext}
        onLast={onLast}
      />
      <ObjectTable
        typeInfoName={typeInfoName}
        typeInfo={typeInfo}
        objectList={itemResults}
        operation={operation}
        onNavigateToType={onNavigateToType}
      />
      <PagingControls
        fullPaging={fullPaging}
        pagingCursor={pagingCursor}
        onFirst={onFirst}
        onPrevious={onPrevious}
        onPageNumber={onPageNumber}
        onNext={onNext}
        onLast={onLast}
      />
    </BaseObjectSearch>
  );
};
