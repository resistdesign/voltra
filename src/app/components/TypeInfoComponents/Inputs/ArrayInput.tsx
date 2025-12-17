import { useCallback, useMemo } from "react";
import styled from "styled-components";
import { TypeInfoField, TypeOperation } from "../../../../common/TypeParsing/TypeInfo";
import { getDefaultValueInfo } from "../../../../common/TypeInfoDataItemUtils";
import { TypeInfoInput } from "../TypeInfoInput";
import { useNonInputProps } from "../InputTypeMapUtils";
import { InputComponent, NameOrIndex } from "../Types";

const ArrayContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5em;
`;

const ArrayItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5em;
`;

const ArrayControls = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5em;
`;

const ActionButton = styled.button`
  flex: 0 0 auto;
`;

export const ArrayInput: InputComponent<HTMLDivElement> = ({
  operation = TypeOperation.CREATE,
  typeInfoField = {} as TypeInfoField,
  value,
  nameOrIndex,
  onChange,
  onNavigateToType,
  customInputTypeMap,
  options: _options,
  ...rest
}) => {
  const arrayValue = useMemo(
    () => (Array.isArray(value) ? value : []),
    [value],
  );
  const elementField = useMemo<TypeInfoField>(
    () => ({
      ...typeInfoField,
      array: false,
    }),
    [typeInfoField],
  );
  const { hasDefaultValue, defaultValue } = useMemo(
    () => getDefaultValueInfo(elementField),
    [elementField],
  );
  const isReadOnly = typeInfoField?.readonly;
  const isRequired = !typeInfoField?.optional;
  const getNewElementValue = useCallback(
    () => (hasDefaultValue ? defaultValue : undefined),
    [defaultValue, hasDefaultValue],
  );
  const onElementChange = useCallback(
    (index: NameOrIndex, newValue: any) => {
      if (typeof index !== "number") {
        return;
      }

      const updatedArray = [...arrayValue];
      updatedArray[index] = newValue;
      onChange(nameOrIndex, updatedArray);
    },
    [arrayValue, nameOrIndex, onChange],
  );
  const onRemove = useCallback(
    (index: number) => {
      if (isReadOnly) {
        return;
      }

      const updatedArray = arrayValue.filter((_, i) => i !== index);
      onChange(nameOrIndex, updatedArray);
    },
    [arrayValue, isReadOnly, nameOrIndex, onChange],
  );
  const onAdd = useCallback(() => {
    if (isReadOnly) {
      return;
    }

    onChange(nameOrIndex, [...arrayValue, getNewElementValue()]);
  }, [arrayValue, getNewElementValue, isReadOnly, nameOrIndex, onChange]);
  const nonInputProps = useNonInputProps(rest);

  return (
    <ArrayContainer {...nonInputProps}>
      {arrayValue.map((itemValue, index) => (
        <ArrayItem key={`${nameOrIndex}-${index}`}>
          <TypeInfoInput
            operation={operation}
            typeInfoField={elementField}
            fieldValue={itemValue}
            nameOrIndex={index}
            onChange={onElementChange}
            onNavigateToType={onNavigateToType}
            customInputTypeMap={customInputTypeMap}
          />
          <ActionButton
            type="button"
            disabled={isReadOnly || (isRequired && arrayValue.length <= 1)}
            onClick={() => onRemove(index)}
          >
            Remove
          </ActionButton>
        </ArrayItem>
      ))}
      <ArrayControls>
        <ActionButton type="button" disabled={isReadOnly} onClick={onAdd}>
          Add
        </ActionButton>
      </ArrayControls>
    </ArrayContainer>
  );
};
