import {
  ChangeEvent as ReactChangeEvent,
  InputHTMLAttributes,
  useCallback,
} from "react";
import { InputComponentProps } from "./Types";

export const StringInput: InputComponentProps<
  InputHTMLAttributes<HTMLInputElement>
> = ({ value, onChange, ...rest }) => {
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      onChange(newValue);
    },
    [onChange],
  );

  return <input type="text" value={`${value ?? ""}`} {...rest} />;
};
