import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useMemo,
} from "react";
import { FieldCriterionControl } from "./FieldCriterionControl";
import { IndexButton } from "../../../Basic/IndexButton";
import styled from "styled-components";
import {
  ComparisonOperators,
  FieldCriterion,
  ListItemsConfig,
  LogicalOperators,
  SearchCriteria,
} from "../../../../../common/SearchTypes";
import {
  TypeInfo,
  TypeInfoMap,
  TypeOperation,
} from "../../../../../common/TypeParsing/TypeInfo";
import { InputComponent } from "../../Types";
import { Form } from "../../../Form";
import { validateSearchFields } from "../../../../../common/SearchValidation";

const BaseSearchControls = styled(Form)`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
`;
const FieldCriterionControlItem = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: center;
  gap: 1em;
`;
const ControlBar = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  gap: 1em;

  & > button {
    flex: 0 0 auto;
    width: unset;
  }
`;

export type SearchControlsProps = {
  typeInfoName: string;
  typeInfoMap: TypeInfoMap;
  operation: TypeOperation;
  typeInfo: TypeInfo;
  listItemsConfig: ListItemsConfig;
  onListItemsConfigChange: (listItemsConfig: ListItemsConfig) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
};

export const SearchControls: FC<SearchControlsProps> = ({
  typeInfoName,
  typeInfoMap,
  operation,
  typeInfo,
  listItemsConfig,
  onListItemsConfigChange,
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
  const onPatchListItemsConfig = useCallback(
    (patch: Partial<ListItemsConfig>) => {
      onListItemsConfigChange({
        cursor: undefined,
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
  const criteriaValid = useMemo(
    () => validateSearchFields(typeInfoName, typeInfoMap, fieldCriteria, true),
    [typeInfoName, typeInfoMap, fieldCriteria],
  );

  return (
    <BaseSearchControls>
      <select value={logicalOperator} onChange={onLogicalOperatorChange}>
        <option value="" disabled>
          Logical Operator
        </option>
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
            operation={operation}
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
      <ControlBar>
        <button onClick={onAddCriterion}>Add Criterion</button>
        <button type="reset" disabled={fieldCriteria.length < 1}>
          Clear
        </button>
        <button type="submit" disabled={!criteriaValid}>
          Search
        </button>
      </ControlBar>
    </BaseSearchControls>
  );
};
