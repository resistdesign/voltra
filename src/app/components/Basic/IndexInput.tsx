import {
  ChangeEvent as ReactChangeEvent,
  FC,
  InputHTMLAttributes,
  useCallback,
} from "react";

export type IndexInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> & {
  index: number;
  onChange?: (event: ReactChangeEvent<HTMLInputElement>, index: number) => void;
};

export const IndexInput: FC<IndexInputProps> = ({
  index,
  onChange,
  ...inputProps
}) => {
  const onChangeInternal = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(event, index);
      }
    },
    [index, onChange],
  );

  return <input {...inputProps} onChange={onChangeInternal} />;
};
