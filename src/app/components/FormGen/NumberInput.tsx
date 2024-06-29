import {
  ChangeEvent as ReactChangeEvent,
  InputHTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from "react";
import { InputComponentProps } from "./Types";

export const NumberInput: InputComponentProps<
  InputHTMLAttributes<HTMLInputElement>
> = ({ value, onChange, ...rest }) => {
  const [internalValue, setInternalValue] = useState(value ?? "");
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      try {
        const newNumberValue = JSON.parse(`${newValue ?? ""}`);

        onChange(newNumberValue);
      } catch (error) {
        setInternalValue(value ?? "");
      }
    },
    [onChange],
  );

  useEffect(() => {
    setInternalValue(value ?? "");
  }, [value]);

  return <input type="text" value={`${value ?? ""}`} {...rest} />;
};
