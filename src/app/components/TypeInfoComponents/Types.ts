import { FC, InputHTMLAttributes } from "react";
import {
  LiteralValue,
  SupportedFieldTags,
  TypeInfoField,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
} from "../../../common";

export type TypeNavigation = Omit<
  BaseItemRelationshipInfo,
  "toTypePrimaryFieldValue"
>;

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
  onNavigateToType?: (nameOrIndex: NameOrIndex) => void;
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;

export type CustomInputComponentMap = Record<string, InputComponent<any>>;

export type TypeInfoDataItem = Record<string, LiteralValue | LiteralValue[]>;

export type TypeInfoDataMap = Record<any, TypeInfoDataItem>;

export type TypeDataStateMap = Record<TypeOperation, TypeInfoDataMap>;

export type TypeInfoDataStructure = Record<string, TypeDataStateMap>;

export type ItemRelationshipInfoStructure = {
  [fromItemType: string]: {
    [fromItemField: string]: {
      [fromItemPrimaryKeyValue: string]: ItemRelationshipInfo[];
    };
  };
};
