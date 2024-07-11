import { useCallback } from "react";
import { InputComponent } from "../../Types";

const ChangeNOOP = () => {};

export const BooleanInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options: { label = "" } = {},
  typeInfoMap: _typeInfoMap,
  typeInfoField: _typeInfoField,
  customInputTypeMap: _customInputTypeMap,
  typeInfoName: _typeInfoName,
  nameOrIndex: _nameOrIndex,
  onNavigateToType: _onNavigateToType,
  ...rest
}) => {
  const onClickHandler = useCallback(() => {
    onChange(!value);
  }, [value, onChange]);

  return (
    <label>
      <input
        type="checkbox"
        checked={value ?? false}
        onClick={onClickHandler}
        onChange={ChangeNOOP}
        {...rest}
      />
      &nbsp;
      {label}
    </label>
  );
};
