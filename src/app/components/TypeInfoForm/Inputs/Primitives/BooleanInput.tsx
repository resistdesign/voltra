import { useCallback, useMemo } from "react";
import { InputComponent } from "../../Types";
import { useNonInputProps } from "../../InputTypeMapUtils";
import { TypeInfoField } from "../../../../../common/TypeParsing/TypeInfo";

const onChangeNOOP = () => {};

export const BooleanInput: InputComponent<HTMLInputElement> = ({
  typeInfoField: { optional, readonly } = {} as TypeInfoField,
  value,
  onChange,
  options: { label = "", constraints: { defaultValue } = {} as any } = {},
  ...rest
}) => {
  const nonInputProps = useNonInputProps(rest);
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
        required={!optional}
        readOnly={readonly}
        {...nonInputProps}
      />
      &nbsp;
      {label}
    </label>
  );
};
