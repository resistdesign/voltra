import { ChangeEvent as ReactChangeEvent, useCallback } from "react";
import { InputComponent } from "../../Types";

export const StringSelector: InputComponent<HTMLSelectElement> = ({
  typeInfoField: { possibleValues = [] } = {},
  value,
  onChange,
  typeInfoMap: _typeInfoMap,
  typeInfoField: _typeInfoField,
  customInputTypeMap: _customInputTypeMap,
  typeInfoName: _typeInfoName,
  nameOrIndex: _nameOrIndex,
  onNavigateToType: _onNavigateToType,
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
      {possibleValues.map((pV, index) => (
        <option key={`Option:${pV}:${index}`} value={`${pV}`}>
          {pV}
        </option>
      ))}
    </select>
  );
};
