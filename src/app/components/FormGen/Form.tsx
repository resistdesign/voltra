import {
  ChangeEvent,
  FC,
  HTMLAttributes,
  PropsWithChildren,
  useCallback,
} from "react";

export type FormProps = PropsWithChildren<
  HTMLAttributes<HTMLFormElement> & {
    onSubmit: () => void;
  }
>;

export const Form: FC<FormProps> = ({ onSubmit, children, ...otherProps }) => {
  const onSubmitInternal = useCallback(
    (event: ChangeEvent<HTMLFormElement>) => {
      event.preventDefault();

      onSubmit();
    },
    [onSubmit],
  );

  return (
    <form {...otherProps} onSubmit={onSubmitInternal}>
      {children}
    </form>
  );
};
