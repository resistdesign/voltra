import {
  ChangeEvent as ReactChangeEvent,
  InputHTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from "react";
import { InputComponent } from "../../Types";

const getAdvancedNumericValue = (value: string | number): number => {
  if (value === "Infinity" || value === "+Infinity" || value === "∞") {
    return Infinity;
  } else if (value === "-Infinity" || value === "-∞") {
    return -Infinity;
  } else {
    const num = JSON.parse(`${value}`);

    if (isNaN(num)) {
      throw new Error("Invalid number");
    }

    return num;
  }
};
const getStringNumericValue = (value: string | number): string =>
  `${value ?? ""}`;

export const NumberInput: InputComponent<
  InputHTMLAttributes<HTMLInputElement>
> = ({ value, onChange, ...rest }) => {
  const [internalNumericValue, setInternalNumericValue] =
    useState<number>(value);
  const [internalValue, setInternalValue] = useState<string>(
    getStringNumericValue(value),
  );
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      try {
        const newNumberValue = getAdvancedNumericValue(newValue);

        setInternalNumericValue(newNumberValue);
      } catch (error) {
        // Ignore.
      }

      setInternalValue(newValue ?? "");
    },
    [onChange],
  );

  useEffect(() => {
    setInternalNumericValue((existingInternalNumVal) => {
      if (value !== existingInternalNumVal) {
        setInternalValue(getStringNumericValue(value));

        return value;
      } else {
        return existingInternalNumVal;
      }
    });
  }, [value]);

  useEffect(() => {
    onChange(internalNumericValue);
  }, [internalNumericValue, onChange]);

  return (
    <input
      type="text"
      value={internalValue}
      onChange={onChangeHandler}
      {...rest}
    />
  );
};
