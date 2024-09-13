import {
  ChangeEvent as ReactChangeEvent,
  FC,
  InputHTMLAttributes,
  useEffect,
  useRef,
} from "react";

export type CheckedState = true | false | "indeterminate";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked"
> & {
  checked?: CheckedState;
};

export const PartiallySelectableCheckbox: FC<CheckboxProps> = ({
  checked = false,
  onChange,
  ...rest
}) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  const onChangeInternal = (event: ReactChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event);
    }
  };

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
