import {
  ChangeEvent as ReactChangeEvent,
  InputHTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from "react";
import { InputComponentProps } from "./Types";

const isExponent = (value: string) =>
  value.includes("e") || value.includes("E");

export const NumberInput: InputComponentProps<
  InputHTMLAttributes<HTMLInputElement>
> = ({ value, onChange, ...rest }) => {
  const [internalNumericValue, setInternalNumericValue] = useState<number>(
    value ?? 0,
  );
  const [internalValue, setInternalValue] = useState<string>(value ?? "0");
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      try {
        const newNumberValue = JSON.parse(`${newValue ?? "0"}`);

        setInternalNumericValue(newNumberValue);
      } catch (error) {
        // Ignore.
      }

      setInternalValue(newValue ?? "0");
    },
    [onChange],
  );

  useEffect(() => {
    setInternalValue(`${value ?? 0}`);
    setInternalNumericValue(value ?? 0);
  }, [value]);

  useEffect(() => {
    onChange(internalNumericValue);
  }, [internalNumericValue, onChange]);

  return (
    <input
      type="text"
      value={`${internalValue ?? ""}`}
      onChange={onChangeHandler}
      {...rest}
    />
  );
};
