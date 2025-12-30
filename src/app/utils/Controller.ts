/**
 * @packageDocumentation
 *
 * Hook for controlled edits of nested object/array values. Returns a local value
 * plus an updater that writes changes back to the parent container.
 */
import { useCallback, useEffect, useState } from "react";

const getKeyValueWithoutError = (obj: any, key: string | number) => {
  try {
    return obj[key];
  } catch (e) {
    return undefined;
  }
};

/**
 * Safely access and update a value in a parent object by its key.
 *
 * @param parentValue - Parent object or array that owns the value.
 * @param key - Object key or array index to access.
 * @param onParentValueChange - Callback invoked with the updated parent value.
 * @param isArrayIndex - Whether the key refers to an array index.
 * @returns Tuple of current value and change handler.
 * */
export const useController = (
  parentValue: any,
  key: string | number,
  onParentValueChange: (value: any) => void,
  isArrayIndex: boolean = false,
) => {
  const [value, setValue] = useState(getKeyValueWithoutError(parentValue, key));
  const onChange = useCallback(
    (value: any) => {
      try {
        setValue(value);

        if (isArrayIndex) {
          const newArray = [...parentValue];

          newArray[key as number] = value;

          onParentValueChange(newArray);
        } else {
          onParentValueChange({
            ...parentValue,
            [key]: value,
          });
        }
      } catch (e) {
        // Ignore.
      }
    },
    [parentValue, key, onParentValueChange, isArrayIndex],
  );

  useEffect(() => {
    try {
      setValue(getKeyValueWithoutError(parentValue, key));
    } catch (e) {
      setValue(undefined);
    }
  }, [parentValue, key]);

  return [value, onChange];
};
