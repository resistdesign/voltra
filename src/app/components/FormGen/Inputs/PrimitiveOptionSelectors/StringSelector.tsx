import { ChangeEvent as ReactChangeEvent, useCallback } from "react";
import { InputComponent } from "../../Types";

export const StringSelector: InputComponent<HTMLSelectElement> = ({
  value,
  onChange,
  options = [],
  ...rest
}) => {
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLSelectElement>) => {
      onChange(newValue === "" ? undefined : `${newValue ?? ""}`);
    },
    [onChange],
  );

  return (
    <select value={`${value ?? ""}`} onChange={onChangeHandler} {...rest}>
      <option value="">Select...</option>
      {options.map((option, index) => (
        <option key={`Option:${option}:${index}`} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};
