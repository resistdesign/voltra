import { useCallback, useMemo } from "react";
import { InputComponent } from "../../Types";
import { useNonInputProps } from "../../InputTypeMapUtils";
import { TypeInfoField } from "../../../../../common/TypeParsing/TypeInfo";

const onChangeNOOP = () => {};

export const BooleanInput: InputComponent<HTMLInputElement> = ({
  typeInfoField: { optional, readonly } = {} as TypeInfoField,
  nameOrIndex,
  value,
  onChange,
  options: { constraints: { defaultValue } = {} as any } = {},
  ...rest
}) => {
  const nonInputProps = useNonInputProps(rest);
  const checked = useMemo(
    () => value ?? defaultValue ?? false,
    [value, defaultValue],
  );
  const onClickHandler = useCallback(() => {
    onChange(nameOrIndex, !checked);
  }, [nameOrIndex, checked, onChange]);

  return (
    <input
      type="checkbox"
      checked={checked}
      onClick={onClickHandler}
      onChange={onChangeNOOP}
      required={!optional}
      readOnly={readonly}
      disabled={readonly}
      {...nonInputProps}
    />
  );
};
