import { useCallback } from "react";
import { InputComponent } from "../../Types";

export const BooleanInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  ...rest
}) => {
  const onClickHandler = useCallback(() => {
    onChange(!value);
  }, [value, onChange]);

  return (
    <input
      type="checkbox"
      checked={value as boolean}
      onClick={onClickHandler}
      {...rest}
    />
  );
};
