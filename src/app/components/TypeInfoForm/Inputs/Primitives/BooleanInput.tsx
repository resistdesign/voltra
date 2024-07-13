import { useCallback, useMemo } from "react";
import { InputComponent } from "../../Types";
import { useNonInputProps } from "../../InputTypeMapUtils";

const onChangeNOOP = () => {};

export const BooleanInput: InputComponent<HTMLInputElement> = ({
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
        {...nonInputProps}
      />
      &nbsp;
      {label}
    </label>
  );
};
