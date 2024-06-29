import {
  ChangeEvent as ReactChangeEvent,
  FC,
  InputHTMLAttributes,
  useCallback,
} from "react";
import { InputProps } from "./Types";

export type StringInputProps = InputProps<
  InputHTMLAttributes<HTMLInputElement>
>;

export const StringInput: FC<StringInputProps> = ({
  value,
  onChange,
  ...rest
}) => {
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      onChange(newValue);
    },
    [onChange],
  );

  return <input type="text" value={`${value ?? ""}`} {...rest} />;
};
