import {
  ChangeEvent as ReactChangeEvent,
  InputHTMLAttributes,
  useCallback,
} from "react";
import { InputComponent } from "./Types";

export const BooleanInput: InputComponent<
  InputHTMLAttributes<HTMLInputElement>
> = ({ value, onChange, ...rest }) => {
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      onChange(newValue ?? false);
    },
    [onChange],
  );

  return (
    <input
      type="checkbox"
      checked={value as boolean}
      onChange={onChangeHandler}
      {...rest}
    />
  );
};
