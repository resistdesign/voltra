import { ButtonHTMLAttributes, FC, useCallback } from "react";

export type IndexButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> & {
  index: number;
  onClick?: (index: number) => void;
};

export const IndexButton: FC<IndexButtonProps> = ({
  index,
  onClick,
  ...buttonProps
}) => {
  const onClickInternal = useCallback(() => {
    if (onClick) {
      onClick(index);
    }
  }, [index, onClick]);

  return <button {...buttonProps} onClick={onClickInternal} />;
};
