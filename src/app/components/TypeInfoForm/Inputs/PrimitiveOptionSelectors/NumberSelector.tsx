import { ChangeEvent as ReactChangeEvent, useCallback } from "react";
import { InputComponent } from "../../Types";
import { useNonInputProps } from "../../InputTypeMapUtils";

export const NumberSelector: InputComponent<HTMLSelectElement> = ({
  typeInfoField: { optional, readonly, possibleValues = [] } = {},
  value,
  onChange,
  ...rest
}) => {
  const nonInputProps = useNonInputProps(rest);
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLSelectElement>) => {
      onChange(newValue === "" ? undefined : Number(newValue));
    },
    [onChange],
  );

  return (
    <select
      value={value ?? ""}
      onChange={onChangeHandler}
      required={!optional}
      disabled={readonly}
      {...nonInputProps}
    >
      {optional ? <option value="">Select...</option> : undefined}
      {possibleValues.map((pV, index) => (
        <option key={`Option:${pV}:${index}`} value={`${pV}`}>
          {pV}
        </option>
      ))}
    </select>
  );
};
