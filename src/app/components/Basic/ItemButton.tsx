import { ButtonHTMLAttributes, useCallback } from "react";

export type ItemButtonItemType = Record<any, any>;

export type ItemButtonProps<
  SpecificItemButtonItemType extends ItemButtonItemType,
> = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  item: SpecificItemButtonItemType;
  onClick?: (item: SpecificItemButtonItemType) => void;
};

export const ItemButton = <
  SpecificItemButtonItemType extends ItemButtonItemType,
>({
  item,
  onClick,
  ...buttonProps
}: ItemButtonProps<SpecificItemButtonItemType>) => {
  const onClickInternal = useCallback(() => {
    onClick?.(item);
  }, [item, onClick]);

  return <button {...buttonProps} onClick={onClickInternal} />;
};
