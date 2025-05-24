import { FC, InputHTMLAttributes } from "react";
import {
  SupportedFieldTags,
  TypeInfoDataItem,
  TypeInfoField,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  ItemRelationshipDestinationItemInfo,
  ItemRelationshipOriginItemInfo,
} from "../../../common/ItemRelationshipInfoTypes";

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

export type TypeNavigationBase = ItemRelationshipOriginItemInfo & {
  // Optional: Describes what kind of operation the user is performing (e.g., view, edit, create).
  toOperation?: TypeOperation;

  // Required: Indicates the mode of interaction (form, list, etc.).
  toMode: TypeNavigationMode;
};

export type TypeNavigationWithDestination = {
  // Required when navigating to a form and not creating a new item.
  toOperation: Exclude<TypeOperation, TypeOperation.CREATE>;
  toMode: TypeNavigationMode.FORM;
} & ItemRelationshipDestinationItemInfo;

export type TypeNavigation =
  | (TypeNavigationBase & Partial<ItemRelationshipDestinationItemInfo>)
  | TypeNavigationWithDestination;

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
