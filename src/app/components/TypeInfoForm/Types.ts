import { FC, InputHTMLAttributes } from "react";
import {
  TypeInfoField,
  TypeInfoMap,
} from "../../../common/TypeParsing/TypeInfo";

export type InputOptions = {
  label?: string;
  format?: string;
  allowCustomSelection?: boolean;
  customInputType?: string;
  constraints?: {
    defaultValue?: any;
    step?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
};

export type TypeNavigation = {
  typeName: string;
  fieldName: string;
};

export type NameOrIndex = string | number;

export type InputProps<ElementPropsType, ValueType = any> = Omit<
  ElementPropsType,
  "value" | "onChange"
> & {
  typeInfoMap?: TypeInfoMap;
  typeInfoField?: TypeInfoField;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  typeInfoName?: string;
  nameOrIndex: NameOrIndex;
  value: ValueType;
  onChange: (nameOrIndex: NameOrIndex, value: any) => void;
  options?: InputOptions;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;

export type CustomInputComponentMap = Record<string, InputComponent<any>>;
