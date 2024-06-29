import { FC } from "react";

export type InputProps<ElementPropsType> = ElementPropsType & {
  value: any;
  onChange: (value: any) => void;
};

export type InputComponent<ElementPropsType> = FC<InputProps<ElementPropsType>>;
