import { ButtonHTMLAttributes, FC, useCallback } from "react";

export type ValueButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> & {
  value: any;
  onClick?: (value: any) => void;
};

export const ValueButton: FC<ValueButtonProps> = ({
  value,
  onClick,
  ...buttonProps
}) => {
  const onClickInternal = useCallback(() => {
    onClick?.(value);
  }, [value, onClick]);

  return <button {...buttonProps} onClick={onClickInternal} />;
};
