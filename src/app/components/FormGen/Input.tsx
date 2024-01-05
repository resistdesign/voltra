import React, { ChangeEvent, FC, FormEvent, useCallback, useMemo } from "react";
import { TypeStructure } from "./TypeParsing/TypeUtils";
import { getUUID } from "./IdUtils";
import styled from "styled-components";
import { DataTypeMap } from "./HelperTypes";

const getInputTypeForTypeStructureType = (type: string) =>
  DataTypeMap[type as keyof typeof DataTypeMap] || "text";

const InputBase = styled.input`
  &[type="date"]:before {
    content: attr(placeholder) !important;
    color: var(--form-element-placeholder-color);
    margin-right: 0.5em;
  }

  &[type="date"]:focus:before,
  &[type="date"]:valid:before {
    content: "";
  }
`;
const RatingBase = styled.fieldset`
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 1em;
  padding: 1em;
  border: 0.05em solid var(--form-element-border-color);
  box-sizing: border-box;
`;
const RatingStarContainer = styled.label`
  &:before {
    content: "★";
    color: var(--pico-form-element-color);
    cursor: pointer;
  }

  &:has(input:checked) {
    &:before {
      color: var(--pico-primary);
    }
  }
`;
const RatingStar = styled.input`
  display: none;
`;

export type InputProps = {
  name: string;
  label?: string;
  type?: string;
  value: any;
  onChange: (name: string, newValue: any) => void;
  options?: TypeStructure | string[];
  allowCustomValue?: boolean;
  readonly?: boolean;
};

export const Input: FC<InputProps> = ({
  name,
  label = "",
  type = "string",
  value,
  onChange,
  options,
  allowCustomValue,
  readonly = false,
}: InputProps) => {
  const convertedType = getInputTypeForTypeStructureType(type);
  const inputUUID = useMemo(() => getUUID(), []);
  const optionsList = useMemo(() => {
    if (Array.isArray(options)) {
      return options;
    } else {
      const { content = [] } = options || {};

      return content.map(({ type }) => type.replace(/['"]/gim, () => ""));
    }
  }, [options]);
  const onChangeInternal = useCallback(
    (
      event:
        | FormEvent<HTMLInputElement>
        | ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          >,
    ) => {
      if (onChange) {
        const { target } = event;
        const { checked, value: inputValue } = target as any;
        const newValue =
          convertedType === DataTypeMap.boolean
            ? checked ?? false
            : convertedType === DataTypeMap.Rating
              ? parseInt(inputValue, 10)
              : inputValue;

        onChange(name, newValue);
      }
    },
    [name, convertedType, value, onChange],
  );
  const cleanValue = useMemo(
    () =>
      convertedType === DataTypeMap.boolean ? value ?? false : value ?? "",
    [convertedType, value],
  );
  const styleObj = useMemo(() => ({ gridArea: name }), [name]);

  return type === "Rating" ? (
    <RatingBase disabled={readonly}>
      <legend>{label}</legend>
      <RatingStarContainer>
        <RatingStar
          type="radio"
          readOnly
          value={1}
          checked={cleanValue >= 1}
          onClick={onChangeInternal}
        />
      </RatingStarContainer>
      <RatingStarContainer>
        <RatingStar
          type="radio"
          readOnly
          value={2}
          checked={cleanValue >= 2}
          onClick={onChangeInternal}
        />
      </RatingStarContainer>
      <RatingStarContainer>
        <RatingStar
          type="radio"
          readOnly
          value={3}
          checked={cleanValue >= 3}
          onClick={onChangeInternal}
        />
      </RatingStarContainer>
      <RatingStarContainer>
        <RatingStar
          type="radio"
          readOnly
          value={4}
          checked={cleanValue >= 4}
          onClick={onChangeInternal}
        />
      </RatingStarContainer>
      <RatingStarContainer>
        <RatingStar
          type="radio"
          readOnly
          value={5}
          checked={cleanValue >= 5}
          onClick={onChangeInternal}
        />
      </RatingStarContainer>
    </RatingBase>
  ) : convertedType === DataTypeMap.boolean ? (
    <InputBase
      readOnly={readonly}
      placeholder={label}
      type={convertedType}
      checked={!!cleanValue}
      onChange={onChangeInternal}
      style={styleObj}
    />
  ) : convertedType === DataTypeMap.LongText ? (
    <textarea
      readOnly={readonly}
      placeholder={label}
      value={cleanValue}
      onChange={onChangeInternal}
      style={styleObj}
      rows={5}
    />
  ) : options && !allowCustomValue ? (
    <select
      disabled={readonly}
      value={cleanValue}
      onChange={onChangeInternal}
      style={styleObj}
    >
      <option value="">{label}</option>
      {optionsList.map((o, index) => (
        <option key={index} value={o}>
          {o}
        </option>
      ))}
    </select>
  ) : (
    <>
      <InputBase
        readOnly={readonly}
        placeholder={label}
        type={convertedType}
        value={`${cleanValue}`}
        onChange={onChangeInternal}
        style={styleObj}
        list={options && allowCustomValue ? inputUUID : undefined}
      />
      {options && allowCustomValue ? (
        <datalist id={inputUUID}>
          {optionsList.map((o, index) => (
            <option key={index} value={o} />
          ))}
        </datalist>
      ) : undefined}
    </>
  );
};
