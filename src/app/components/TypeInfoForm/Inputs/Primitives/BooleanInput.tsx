import { useCallback } from "react";
import { InputComponent } from "../../Types";

const onChangeNOOP = () => {};

export const BooleanInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options: { label = "", constraintsJSON: { defaultValue } = {} as any } = {},
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
        checked={value ?? defaultValue ?? false}
        onClick={onClickHandler}
        onChange={onChangeNOOP}
        {...rest}
      />
      &nbsp;
      {label}
    </label>
  );
};
