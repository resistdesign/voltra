import {
  ChangeEvent as ReactChangeEvent,
  useCallback,
  useEffect,
  useRef,
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

export const NumberInput: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  ...rest
}) => {
  const [internalValue, setInternalValue] = useState<string>(
    getStringNumericValue(value),
  );
  const internalValueRef = useRef(internalValue);
  internalValueRef.current = internalValue;
  const onChangeHandler = useCallback(
    ({ target: { value: newValue } }: ReactChangeEvent<HTMLInputElement>) => {
      try {
        const newNumberValue = getAdvancedNumericValue(newValue);

        onChange(newNumberValue);
      } catch (error) {
        // Ignore.
      }

      setInternalValue(newValue ?? "");
    },
    [onChange],
  );

  useEffect(() => {
    try {
      const internalValueAsNumber = getAdvancedNumericValue(
        internalValueRef.current,
      );

      if (value !== internalValueAsNumber) {
        setInternalValue(getStringNumericValue(value));
      }
    } catch (error) {
      // Ignore.
    }
  }, [value]);

  return (
    <input
      type="text"
      value={internalValue}
      onChange={onChangeHandler}
      {...rest}
    />
  );
};
