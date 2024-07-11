import { ChangeEvent as ReactChangeEvent, useCallback } from "react";
import { InputComponent } from "../../Types";

export const StringInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options: { label = "" } = {},
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
      type="text"
      placeholder={label}
      value={`${value ?? ""}`}
      onChange={onChangeHandler}
      {...rest}
    />
  );
};
