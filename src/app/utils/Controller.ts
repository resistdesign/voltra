import { useCallback, useEffect, useState } from 'react';

const getKeyValueWithoutError = (obj: any, key: string | number) => {
  try {
    return obj[key];
  } catch (e) {
    return undefined;
  }
};

export const useController = (
  parentValue: any,
  key: string | number,
  onParentValueChange: (value: any) => void,
  isArrayIndex: boolean = false
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
    [parentValue, key, onParentValueChange, isArrayIndex]
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
