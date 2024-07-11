import { useCallback } from "react";
import { InputComponent } from "../../Types";

const ChangeNOOP = () => {};

export const BooleanInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options: { label = "" } = {},
  ...rest
}) => {
  const onClickHandler = useCallback(() => {
    onChange(!value);
  }, [value, onChange]);

  return (
    <label>
      <input
        type="checkbox"
        checked={value as boolean}
        onClick={onClickHandler}
        onChange={ChangeNOOP}
        {...rest}
      />
      &nbsp;
      {label}
    </label>
  );
};
