import { FC, InputHTMLAttributes } from "react";
import {
  SupportedFieldTags,
  TypeInfoDataItem,
  TypeInfoField,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import { ItemRelationshipInfo } from "../../../common/ItemRelationshipInfoTypes";

export enum TypeNavigationMode {
  /**
   * You edit and submit an item and it is saved.
   * */
  FORM = "FORM",
  /**
   * You view the item or list of items that are related to a previous item.
   * */
  RELATED_ITEMS = "RELATED_ITEMS",
  /**
   * You search for and relate items to a previous item.
   * */
  SEARCH_ITEMS = "SEARCH_ITEMS",
}

export type TypeNavigation = {
  /**
   * The name of the type to navigate to.
   * */
  typeName: string;
  /**
   * The name of the field to show relationships for.
   * */
  fieldName?: string;
  /**
   * Implementations need to set this based on user intent when coming from the source item in an item relationship.
   * */
  operation?: TypeOperation;
  /**
   * How are we interacting with an item or items?
   * */
  mode: TypeNavigationMode;
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
