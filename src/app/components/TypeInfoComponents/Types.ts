import { FC, InputHTMLAttributes } from "react";
import {
  SupportedFieldTags,
  TypeInfoField,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  ItemRelationshipDestinationItemInfo,
  ItemRelationshipOriginItemInfo,
} from "../../../common/ItemRelationshipInfoTypes";
import { ExpandComplexType } from "../../../common/HelperTypes";

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

export type TypeNavigationBase = ExpandComplexType<
  ItemRelationshipOriginItemInfo & {
    // Optional: Describes what kind of operation the user is performing (e.g., view, edit, create).
    toOperation?: TypeOperation;
    // TODO: Do we need a `TypeNavigationMode` specifically for `TypeOperation.READ`?
    // Required: Indicates the mode of interaction (form, list, etc.).
    toMode: TypeNavigationMode;
  }
>;

export type TypeNavigationWithOptionalDestinationItem = ExpandComplexType<
  TypeNavigationBase & Partial<ItemRelationshipDestinationItemInfo>
>;

export type TypeNavigationWithRequiredDestinationItem = ExpandComplexType<
  ItemRelationshipOriginItemInfo & {
    // Required when navigating to a form and not creating a new item.
    toOperation: TypeOperation.UPDATE;
    toMode: TypeNavigationMode.FORM;
    toTypePrimaryFieldValue: string;
  } & ItemRelationshipDestinationItemInfo
>;

export type TypeNavigation = ExpandComplexType<
  | TypeNavigationWithOptionalDestinationItem
  | TypeNavigationWithRequiredDestinationItem
>;

export type NameOrIndex = string | number;

export type InputProps<ElementPropsType, ValueType = any> = Omit<
  ElementPropsType,
  "value" | "onChange"
> & {
  operation: TypeOperation;
  nameOrIndex: NameOrIndex;
  typeInfoField?: TypeInfoField;
  value: ValueType;
  onChange: (nameOrIndex: NameOrIndex, value: any) => void;
  options?: SupportedFieldTags;
  onNavigateToType?: (nameOrIndex: NameOrIndex) => void;
  customInputTypeMap?: CustomInputComponentMap;
};

export type InputComponent<ElementPropsType> = FC<
  InputProps<InputHTMLAttributes<ElementPropsType>>
>;

export type CustomInputComponentMap = Record<string, InputComponent<any>>;
