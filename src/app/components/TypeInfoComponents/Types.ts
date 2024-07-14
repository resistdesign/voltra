import { FC, InputHTMLAttributes } from "react";
import {
  LiteralValue,
  TypeInfoField,
} from "../../../common/TypeParsing/TypeInfo";

export type InputOptions = {
  primaryField?: boolean;
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
  primaryKeyValue?: any;
};

export type NameOrIndex = string | number;

export type InputProps<ElementPropsType, ValueType = any> = Omit<
  ElementPropsType,
  "value" | "onChange"
> & {
  nameOrIndex: NameOrIndex;
  typeInfoField?: TypeInfoField;
  value: ValueType;
  onChange: (nameOrIndex: NameOrIndex, value: any) => void;
  options?: InputOptions;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;

export type CustomInputComponentMap = Record<string, InputComponent<any>>;

export type TypeInfoDataItem = Record<string, LiteralValue | LiteralValue[]>;

export type TypeInfoDataMap = Record<any, TypeInfoDataItem>;

export type TypeDataStateMap = {
  create: TypeInfoDataMap;
  update: TypeInfoDataMap;
};

export type TypeInfoDataStructure = Record<string, TypeDataStateMap>;
