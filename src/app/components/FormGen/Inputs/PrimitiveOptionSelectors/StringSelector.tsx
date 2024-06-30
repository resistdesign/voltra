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
      onChange(newValue);
    },
    [onChange],
  );

  return (
    <select value={`${value ?? ""}`} onChange={onChangeHandler} {...rest}>
      <option value={undefined}>Select...</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};
