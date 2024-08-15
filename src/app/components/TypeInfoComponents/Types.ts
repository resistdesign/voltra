import { FC, InputHTMLAttributes } from "react";
import {
  LiteralValue,
  SupportedFieldTags,
  TypeInfoField,
} from "../../../common/TypeParsing/TypeInfo";

export enum TypeInfoDataItemOperation {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

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
  options?: SupportedFieldTags;
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
