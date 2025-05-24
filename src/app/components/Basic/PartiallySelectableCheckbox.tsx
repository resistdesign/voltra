import {
  ChangeEvent as ReactChangeEvent,
  FC,
  InputHTMLAttributes,
  useCallback,
  useEffect,
  useRef,
} from "react";

export const CheckedStateIndeterminate = "indeterminate" as const;

export type CheckedState = true | false | typeof CheckedStateIndeterminate;

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "onChange"
> & {
  checked?: CheckedState;
  onChange?: (newChecked: boolean) => void;
};

export const PartiallySelectableCheckbox: FC<CheckboxProps> = ({
  checked = false,
  onChange,
  ...rest
}) => {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const onChangeInternal = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        if (event.target.checked) {
          onChange(true);
        } else {
          onChange(false);
        }
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = checked === "indeterminate";
    }
  }, [checked]);

  return (
    <input
      type="checkbox"
      checked={checked === (true as boolean)}
      ref={checkboxRef}
      onChange={onChangeInternal}
      {...rest}
    />
  );
};
