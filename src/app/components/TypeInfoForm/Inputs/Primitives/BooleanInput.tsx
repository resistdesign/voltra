import { useCallback, useMemo } from "react";
import { InputComponent } from "../../Types";

const onChangeNOOP = () => {};

export const BooleanInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options: { label = "", constraints: { defaultValue } = {} as any } = {},
  typeInfoMap: _typeInfoMap,
  typeInfoField: _typeInfoField,
  customInputTypeMap: _customInputTypeMap,
  typeInfoName: _typeInfoName,
  nameOrIndex: _nameOrIndex,
  onNavigateToType: _onNavigateToType,
  ...rest
}) => {
  const checked = useMemo(
    () => value ?? defaultValue ?? false,
    [value, defaultValue],
  );
  const onClickHandler = useCallback(() => {
    onChange(!checked);
  }, [checked, onChange]);

  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onClick={onClickHandler}
        onChange={onChangeNOOP}
        {...rest}
      />
      &nbsp;
      {label}
    </label>
  );
};
