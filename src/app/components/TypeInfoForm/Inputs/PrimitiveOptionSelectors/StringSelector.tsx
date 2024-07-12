import { ChangeEvent as ReactChangeEvent, useCallback } from "react";
import { InputComponent } from "../../Types";
import { getNonInputProps } from "../../InputTypeMapUtils";

export const StringSelector: InputComponent<HTMLSelectElement> = ({
  typeInfoField: { possibleValues = [] } = {},
  value,
  onChange,
  ...rest
}) => {
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLSelectElement>) => {
      onChange(newValue === "" ? undefined : `${newValue ?? ""}`);
    },
    [onChange],
  );

  return (
    <select
      value={`${value ?? ""}`}
      onChange={onChangeHandler}
      {...getNonInputProps(rest)}
    >
      <option value="">Select...</option>
      {possibleValues.map((pV, index) => (
        <option key={`Option:${pV}:${index}`} value={`${pV}`}>
          {pV}
        </option>
      ))}
    </select>
  );
};
