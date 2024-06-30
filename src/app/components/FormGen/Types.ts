import { FC, InputHTMLAttributes } from "react";

export type InputProps<ElementPropsType> = ElementPropsType & {
  value: any;
  onChange: (value: any) => void;
  // TODO: Required fields.
  options?: any[];
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;
