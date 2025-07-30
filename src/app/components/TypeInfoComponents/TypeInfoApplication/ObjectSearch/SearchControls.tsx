import {
  ChangeEvent as ReactChangeEvent,
  FC,
  FormEvent as ReactFormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
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

const DEFAULT_SEARCH_CRITERIA: SearchCriteria = {
  logicalOperator: LogicalOperators.OR,
  fieldCriteria: [],
};

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
    criteria: searchCriteria = DEFAULT_SEARCH_CRITERIA,
  }: Partial<ListItemsConfig> = listItemsConfig || {};
  const [internalSearchCriteria, setInternalSearchCriteria] =
    useState<SearchCriteria>(searchCriteria ?? DEFAULT_SEARCH_CRITERIA);
  const {
    logicalOperator = LogicalOperators.OR,
    fieldCriteria = [],
  }: Partial<SearchCriteria> = internalSearchCriteria;
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
  const onFieldCriterionChange = useCallback(
    (index: number, newFieldCriterion: FieldCriterion) => {
      const newFieldCriteria = [...fieldCriteria].map(
        (fieldCriterionItem, fieldCriterionIndex) =>
          fieldCriterionIndex === index
            ? newFieldCriterion
            : fieldCriterionItem,
      );

      setInternalSearchCriteria((previousSearchCriteria) => ({
        ...previousSearchCriteria,
        fieldCriteria: newFieldCriteria,
      }));
    },
    [fieldCriteria, setInternalSearchCriteria],
  );
  const onLogicalOperatorChange = useCallback(
    (event: ReactChangeEvent<HTMLSelectElement>) => {
      const newLogicalOperator = event.target.value as LogicalOperators;

      setInternalSearchCriteria((previousSearchCriteria) => ({
        ...previousSearchCriteria,
        logicalOperator: newLogicalOperator,
      }));
    },
    [setInternalSearchCriteria],
  );
  const logicalOperatorOptions = useMemo(
    () => Object.values(LogicalOperators),
    [],
  );
  const logicalOperatorLabels = useMemo(
    () => Object.keys(LogicalOperators),
    [],
  );
  const onAddCriterion = useCallback(() => {
    setInternalSearchCriteria((previousSearchCriteria) => ({
      ...previousSearchCriteria,
      fieldCriteria: [
        ...(fieldCriteria ?? []),
        {
          fieldName: "",
          operator: ComparisonOperators.EQUALS,
          value: "",
        },
      ],
    }));
  }, [fieldCriteria, setInternalSearchCriteria]);
  const onRemoveCriterion = useCallback(
    (index: number) => {
      const newFieldCriteria = [...fieldCriteria].filter(
        (_, fieldCriterionIndex) => fieldCriterionIndex !== index,
      );

      setInternalSearchCriteria((previousSearchCriteria) => ({
        ...previousSearchCriteria,
        fieldCriteria: newFieldCriteria,
      }));
    },
    [fieldCriteria, setInternalSearchCriteria],
  );
  const criteriaValid = useMemo(() => {
    const { valid = false } = validateSearchFields(
      typeInfoName,
      typeInfoMap,
      fieldCriteria,
      true,
    );

    return valid;
  }, [typeInfoName, typeInfoMap, fieldCriteria]);
  const onSubmit = useCallback(() => {
    onPatchListItemsConfig({
      criteria: internalSearchCriteria,
    });
  }, [internalSearchCriteria, onPatchListItemsConfig]);
  const onReset = useCallback(
    (event: ReactFormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setInternalSearchCriteria(DEFAULT_SEARCH_CRITERIA);
    },
    [searchCriteria],
  );

  useEffect(() => {
    setInternalSearchCriteria((previousSearchCriteria) =>
      searchCriteria === previousSearchCriteria
        ? previousSearchCriteria
        : searchCriteria,
    );
  }, [searchCriteria]);

  return (
    <BaseSearchControls onSubmit={onSubmit} onReset={onReset}>
      <select value={logicalOperator} onChange={onLogicalOperatorChange}>
        <option value="" disabled>
          Logical Operator
        </option>
        {logicalOperatorOptions.map((operator, opIdx) => (
          <option key={operator} value={operator}>
            {logicalOperatorLabels[opIdx]}
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
        <button type="button" onClick={onAddCriterion}>
          Add Criterion
        </button>
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
