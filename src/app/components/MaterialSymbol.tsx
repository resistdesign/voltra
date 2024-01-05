import 'material-symbols';
import { FC, HTMLAttributes, PropsWithChildren } from 'react';

export type MaterialSymbolVariant = 'outlined' | 'rounded' | 'sharp';

export type MaterialSymbolProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    variant?: MaterialSymbolVariant;
  }
>;

export const MaterialSymbol: FC<MaterialSymbolProps> = ({
  variant = 'outlined',
  children,
  ...rest
}: MaterialSymbolProps) => (
  <span className={`material-symbols-${variant}`} {...rest}>
    {children}
  </span>
);

export const SYM = MaterialSymbol;
