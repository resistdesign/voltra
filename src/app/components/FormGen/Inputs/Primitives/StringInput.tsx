import {
  ChangeEvent as ReactChangeEvent,
  InputHTMLAttributes,
  useCallback,
} from "react";
import { InputComponent } from "../../Types";

export const StringInput: InputComponent<
  InputHTMLAttributes<HTMLInputElement>
> = ({ value, onChange, ...rest }) => {
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      onChange(newValue ?? "");
    },
    [onChange],
  );

  return (
    <input
      type="text"
      value={`${value ?? ""}`}
      onChange={onChangeHandler}
      {...rest}
    />
  );
};
