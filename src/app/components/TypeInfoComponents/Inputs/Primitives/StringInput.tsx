import { ChangeEvent as ReactChangeEvent, useCallback } from "react";
import { InputComponent } from "../../Types";
import { useNonInputProps } from "../../InputTypeMapUtils";
import { TypeInfoField } from "../../../../../common/TypeParsing/TypeInfo";

export const StringInput: InputComponent<HTMLInputElement> = ({
  typeInfoField: { optional, readonly } = {} as TypeInfoField,
  nameOrIndex,
  value,
  onChange,
  options: {
    label = "",
    format = "text",
    constraints: { defaultValue, step, min, max, pattern } = {} as any,
  } = {},
  ...rest
}) => {
  const nonInputProps = useNonInputProps(rest);
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      onChange(nameOrIndex, newValue === "" ? undefined : newValue);
    },
    [nameOrIndex, onChange],
  );

  return (
    <input
      type={format}
      placeholder={label}
      value={`${value || (defaultValue ?? "")}`}
      onChange={onChangeHandler}
      step={step}
      min={min}
      max={max}
      pattern={pattern}
      required={!optional}
      readOnly={readonly}
      {...nonInputProps}
    />
  );
};
