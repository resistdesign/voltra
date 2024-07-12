import { ChangeEvent as ReactChangeEvent, useCallback } from "react";
import { InputComponent } from "../../Types";
import { getNonInputProps } from "../../InputTypeMapUtils";

export const StringInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options: {
    label = "",
    format = "text",
    constraints: { defaultValue, step, min, max, pattern } = {} as any,
  } = {},
  ...rest
}) => {
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      onChange(newValue === "" ? undefined : newValue);
    },
    [onChange],
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
      {...getNonInputProps(rest)}
    />
  );
};
