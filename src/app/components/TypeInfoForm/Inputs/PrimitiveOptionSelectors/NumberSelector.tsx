import { ChangeEvent as ReactChangeEvent, useCallback } from "react";
import { InputComponent } from "../../Types";

export const NumberSelector: InputComponent<HTMLSelectElement> = ({
  typeInfoField: { possibleValues = [] } = {},
  value,
  onChange,
  ...rest
}) => {
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLSelectElement>) => {
      onChange(newValue === "" ? undefined : Number(newValue));
    },
    [onChange],
  );

  return (
    <select value={value ?? ""} onChange={onChangeHandler} {...rest}>
      <option value="">Select...</option>
      {possibleValues.map((pV, index) => (
        <option key={`Option:${pV}:${index}`} value={`${pV}`}>
          {pV}
        </option>
      ))}
    </select>
  );
};
