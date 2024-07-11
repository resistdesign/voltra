import { FC, InputHTMLAttributes } from "react";
import {
  TypeInfoField,
  TypeInfoMap,
} from "../../../common/TypeParsing/TypeInfo";

export type InputOptions = Partial<{
  label: string;
}>;

export type InputProps<ElementPropsType, ValueType = any> = Omit<
  ElementPropsType,
  "value"
> & {
  typeInfoMap: TypeInfoMap;
  typeInfoField?: TypeInfoField;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  typeInfoName?: string;
  nameOrIndex?: string | number;
  value: ValueType;
  onChange: (value: any) => void;
  options?: InputOptions;
  onNavigateToType?: (typeName: string) => void;
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;

export type CustomInputComponentMap = Record<string, InputComponent<any>>;
