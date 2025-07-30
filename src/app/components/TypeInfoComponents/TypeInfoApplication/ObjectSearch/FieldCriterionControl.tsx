import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useMemo,
} from "react";
import styled from "styled-components";
import { TypeInfoInput } from "../../TypeInfoInput";
import {
  ComparisonOperators,
  FieldCriterion,
} from "../../../../../common/SearchTypes";
import {
  TypeInfo,
  TypeOperation,
} from "../../../../../common/TypeParsing/TypeInfo";
import { InputComponent, NameOrIndex } from "../../Types";

const FieldCriterionControlBase = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: center;
  gap: 1em;
`;

export type FieldCriterionControlProps = {
  index: number;
  operation: TypeOperation;
  fieldCriterion: FieldCriterion;
  typeInfo: TypeInfo;
  onChange: (index: number, fieldCriterion: FieldCriterion) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
};

export const FieldCriterionControl: FC<FieldCriterionControlProps> = ({
  index,
  operation,
  fieldCriterion,
  typeInfo,
  onChange,
  customInputTypeMap,
}) => {
  const { fieldName, operator, value: fieldValue } = fieldCriterion;
  const { fields: typeInfoFields = {} } = typeInfo;
  const selectedTypeInfoField = useMemo(
    () => typeInfo?.fields?.[fieldName],
    [typeInfo, fieldName],
  );
  const onPatchFieldCriterion = useCallback(
    (newFieldCriterion: Partial<FieldCriterion>) => {
      onChange(index, { ...fieldCriterion, ...newFieldCriterion });
    },
    [fieldCriterion, onChange],
  );
  const onFieldSelectionChange = useCallback(
    (event: ReactChangeEvent<HTMLSelectElement>) => {
      const fieldName = event.target.value;

      if (fieldName) {
        onPatchFieldCriterion({ fieldName });
      }
    },
    [onPatchFieldCriterion],
  );
  const onOperatorSelectionChange = useCallback(
    (event: ReactChangeEvent<HTMLSelectElement>) => {
      const operator = event.target.value as FieldCriterion["operator"];

      if (operator) {
        onPatchFieldCriterion({ operator });
      }
    },
    [onPatchFieldCriterion],
  );
  const onValueChange = useCallback(
    (_nameOrIndex: NameOrIndex, value: any) => {
      onPatchFieldCriterion({ value });
    },
    [onPatchFieldCriterion],
  );
  const fieldOptions = useMemo<string[]>(() => {
    return Object.keys(typeInfoFields).filter((fieldNameOption) => {
      // IMPORTANT: DO NOT ALLOW TypeReference fields or fields with READ denied.
      const {
        [fieldNameOption]: {
          typeReference,
          tags: { deniedOperations: { READ: readDenied = false } = {} } = {},
        } = {},
      } = typeInfoFields;

      return !typeReference && !readDenied;
    });
  }, [typeInfoFields]);
  const fieldLabels = useMemo<string[]>(() => {
    return fieldOptions.map((fO) => {
      const { [fO]: { tags: { label = fO } = {} } = {} } = typeInfoFields;

      return label;
    });
  }, [typeInfoFields, fieldOptions]);
  const operatorOptions = useMemo(() => Object.values(ComparisonOperators), []);

  return (
    <FieldCriterionControlBase>
      <select value={fieldName} onChange={onFieldSelectionChange}>
        <option value="">Field</option>
        {fieldOptions.map((fieldOption, fOI) => (
          <option key={fieldOption} value={fieldOption}>
            {fieldLabels[fOI]}
          </option>
        ))}
      </select>
      <select value={operator} onChange={onOperatorSelectionChange}>
        <option value="">Operator</option>
        {operatorOptions.map((operatorOption) => (
          <option key={operatorOption} value={operatorOption}>
            {operatorOption}
          </option>
        ))}
      </select>
      {selectedTypeInfoField ? (
        <TypeInfoInput
          operation={operation}
          typeInfoField={selectedTypeInfoField}
          fieldValue={fieldValue}
          nameOrIndex={fieldName}
          onChange={onValueChange}
          customInputTypeMap={customInputTypeMap}
          ignoreTypeReferences
        />
      ) : undefined}
    </FieldCriterionControlBase>
  );
};
