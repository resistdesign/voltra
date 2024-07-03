import {
  ChangeEvent as ReactChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { InputComponent } from "../../Types";

const getAdvancedNumericValue = (
  value: string | number,
): number | undefined => {
  if (value === "Infinity" || value === "+Infinity" || value === "∞") {
    return Infinity;
  } else if (value === "-Infinity" || value === "-∞") {
    return -Infinity;
  } else {
    let num: number | undefined;

    try {
      num = JSON.parse(`${value}`);
    } catch (error) {
      // Ignore.
    }

    if (isNaN(num ?? NaN) || typeof num !== "number") {
      num = undefined;
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
      const newNumberValue = getAdvancedNumericValue(newValue);

      onChange(newNumberValue);
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
