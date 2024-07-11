import { FC, InputHTMLAttributes } from "react";
import {TypeInfoField, TypeInfoMap} from "../../../common/TypeParsing/TypeInfo";

export type InputOptions = Partial<{
  label: string;
}>;

export type InputProps<ElementPropsType> = ElementPropsType & {
  typeInfoMap: TypeInfoMap;
  typeInfoField: TypeInfoField;
  nameOrIndex: string | number;
  value: any;
  onChange: (value: any) => void;
  options?: InputOptions;
  onNavigateToType?: (typeName: string) => void;
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;

export type CustomInputComponentMap = Record<string, InputComponent<any>>;
