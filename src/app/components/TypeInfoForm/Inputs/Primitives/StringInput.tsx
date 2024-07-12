import { ChangeEvent as ReactChangeEvent, useCallback, useMemo } from "react";
import { InputComponent } from "../../Types";

export const StringInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options: {
    label = "",
    format = "text",
    constraints: { defaultValue, step, min, max, pattern } = {} as any,
  } = {},
  typeInfoMap: _typeInfoMap,
  typeInfoField: _typeInfoField,
  customInputTypeMap: _customInputTypeMap,
  typeInfoName: _typeInfoName,
  nameOrIndex: _nameOrIndex,
  onNavigateToType: _onNavigateToType,
  ...rest
}) => {
  const cleanPattern = useMemo(
    () => (pattern ? `${pattern}`.replace(/\\/gim, "\\\\") : pattern),
    [pattern],
  );

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
      pattern={cleanPattern}
      {...rest}
    />
  );
};
