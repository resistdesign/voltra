import { FC, InputHTMLAttributes } from "react";

export type InputProps<ElementPropsType> = ElementPropsType & {
  value: any;
  onChange: (value: any) => void;
  options?: any[];
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;
