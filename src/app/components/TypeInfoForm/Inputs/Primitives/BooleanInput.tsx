import { useCallback, useMemo } from "react";
import { InputComponent } from "../../Types";
import { getNonInputProps } from "../../InputTypeMapUtils";

const onChangeNOOP = () => {};

export const BooleanInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options: { label = "", constraints: { defaultValue } = {} as any } = {},
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
        {...getNonInputProps(rest)}
      />
      &nbsp;
      {label}
    </label>
  );
};
