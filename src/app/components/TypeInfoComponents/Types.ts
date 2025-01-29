import { FC, InputHTMLAttributes } from "react";
import {
  SupportedFieldTags,
  TypeInfoDataItem,
  TypeInfoField,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
} from "../../../common/ItemRelationshipInfoTypes";

export enum TypeNavigationMode {
  LIST = "LIST",
  FORM = "FORM",
}

export type TypeNavigation = Omit<
  BaseItemRelationshipInfo,
  "toTypePrimaryFieldValue"
> & {
  mode: TypeNavigationMode;
  operation: TypeOperation;
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
  onNavigateToType?: (nameOrIndex: NameOrIndex) => void;
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;

export type CustomInputComponentMap = Record<string, InputComponent<any>>;

export type TypeInfoDataMap = {
  [primaryKeyValue: string]: TypeInfoDataItem;
};

export type TypeDataStateMap = Record<TypeOperation, TypeInfoDataMap>;

export type TypeInfoDataStructure = {
  [typeInfoName: string]: TypeDataStateMap;
};

export type ItemRelationshipInfoStructure = {
  [fromItemType: string]: {
    [fromItemField: string]: {
      [fromItemPrimaryKeyValue: string]: ItemRelationshipInfo[];
    };
  };
};
