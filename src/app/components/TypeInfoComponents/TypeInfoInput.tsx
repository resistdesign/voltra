import { FC } from "react";
import { ObjectSelector } from "./Inputs/ObjectSelector";
import { getInputType } from "./InputTypeMapUtils";
import {
  LiteralValue,
  TypeInfoField,
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
  typeInfoField: TypeInfoField;
  fieldValue: LiteralValue | LiteralValue[];
  nameOrIndex: NameOrIndex;
  onChange: (nameOrIndex: NameOrIndex, value: any) => void;
  onNavigateToType?: (nameOrIndex: NameOrIndex) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  ignoreTypeReferences?: boolean;
};

export const TypeInfoInput: FC<TypeInfoInputProps> = ({
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

  if (!hidden && !(ignoreTypeReferences && typeReference)) {
    const isSelect = possibleValues.length > 0;
    const InputComponent = typeReference
      ? ObjectSelector
      : getInputType(
          fieldType,
          array,
          isSelect,
          allowCustomSelection,
          customType,
          customInputTypeMap,
        );

    return InputComponent ? (
      <label>
        <LabelText>{label}&nbsp;</LabelText>
        <InputComponent
          nameOrIndex={nameOrIndex}
          typeInfoField={typeInfoField}
          value={fieldValue}
          onChange={onChange}
          options={tags}
          onNavigateToType={onNavigateToType}
        />
        <LabelText>&nbsp;{label}</LabelText>
      </label>
    ) : undefined;
  }
};
