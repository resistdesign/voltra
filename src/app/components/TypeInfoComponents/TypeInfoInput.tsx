import { FC, useMemo } from "react";
import { ObjectSelector } from "./Inputs/ObjectSelector";
import { getInputType } from "./InputTypeMapUtils";
import {
  LiteralValue,
  TypeInfoField,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import { InputComponent, NameOrIndex } from "./Types";
import styled from "styled-components";

const LabelText = styled.span`
  &:has(+ input[type="checkbox"]) {
    display: none;
  }

  :not(input[type="checkbox"]) + & {
    display: none;
  }
`;

export type TypeInfoInputProps = {
  operation: TypeOperation;
  typeInfoField: TypeInfoField;
  fieldValue: LiteralValue | LiteralValue[];
  nameOrIndex: NameOrIndex;
  onChange: (nameOrIndex: NameOrIndex, value: any) => void;
  onNavigateToType?: (nameOrIndex: NameOrIndex) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  ignoreTypeReferences?: boolean;
};

export const TypeInfoInput: FC<TypeInfoInputProps> = ({
  operation,
  typeInfoField,
  fieldValue,
  nameOrIndex,
  onChange,
  onNavigateToType,
  customInputTypeMap,
  ignoreTypeReferences = false,
}) => {
  const {
    type: fieldType,
    typeReference,
    possibleValues = [],
    array,
    tags = {},
  } = typeInfoField;
  const { label = "", allowCustomSelection, customType, hidden } = tags;
  const normalizedValue = useMemo(
    () => (array ? (Array.isArray(fieldValue) ? fieldValue : []) : fieldValue),
    [array, fieldValue],
  );
  const InputComponent = useMemo(() => {
    if (!hidden && !(ignoreTypeReferences && typeReference)) {
      const isSelect = possibleValues.length > 0;

      return array
        ? getInputType(
            fieldType,
            array,
            isSelect,
            allowCustomSelection,
            customType,
            customInputTypeMap,
          )
        : typeReference
          ? ObjectSelector
          : getInputType(
              fieldType,
              array,
              isSelect,
              allowCustomSelection,
              customType,
              customInputTypeMap,
            );
    }
  }, [
    fieldType,
    array,
    possibleValues,
    typeReference,
    allowCustomSelection,
    customType,
    customInputTypeMap,
    hidden,
    ignoreTypeReferences,
  ]);

  return InputComponent ? (
    <label>
      <LabelText>{label}&nbsp;</LabelText>
      <InputComponent
        operation={operation}
        nameOrIndex={nameOrIndex}
        typeInfoField={typeInfoField}
        value={normalizedValue}
        onChange={onChange}
        options={tags}
        onNavigateToType={onNavigateToType}
        customInputTypeMap={customInputTypeMap}
      />
      <LabelText>&nbsp;{label}</LabelText>
    </label>
  ) : undefined;
};
