import { FC, InputHTMLAttributes } from "react";
import {
  SupportedTags,
  LiteralValue,
  TypeInfoField,
} from "../../../common/TypeParsing/TypeInfo";

export type TypeInfoDataItemOperation = "create" | "update" | "delete";

export type TypeNavigation = {
  typeName: string;
  fieldNameOrIndex: NameOrIndex;
  operation: TypeInfoDataItemOperation;
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
  options?: SupportedTags;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;

export type CustomInputComponentMap = Record<string, InputComponent<any>>;

export type TypeInfoDataItem = Record<string, LiteralValue | LiteralValue[]>;

export type TypeInfoDataMap = Record<any, TypeInfoDataItem>;

export type TypeDataStateMap = Record<
  TypeInfoDataItemOperation,
  TypeInfoDataMap
>;

export type TypeInfoDataStructure = Record<string, TypeDataStateMap>;
