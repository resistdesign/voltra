/**
 * @packageDocumentation
 *
 * Types for the form generation system.
 */

import type {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoField,
  TypeOperation,
} from "../../common/TypeParsing/TypeInfo";
import type { ItemRelationshipInfoType } from "../../common/ItemRelationshipInfoTypes";

export type FormValues = Partial<TypeInfoDataItem>;
export type FormValue = TypeInfoDataItem[keyof TypeInfoDataItem];

type FieldConstraints = NonNullable<TypeInfoField["tags"]>["constraints"];

/**
 * Props for primitive input components.
 */
export interface PrimitiveInputProps<T = unknown> {
  value: T;
  onChange: (value: T) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

/**
 * Props for the AutoField component.
 */
export interface AutoFieldProps {
  field: TypeInfoField;
  fieldKey: string;
  value: FormValue | undefined;
  onChange: (value: FormValue) => void;
  error?: string;
  disabled?: boolean;
  onRelationAction?: (payload: RelationActionPayload) => void;
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
}

export type FormFieldController = {
  key: string;
  field: TypeInfoField;
  label: string;
  required: boolean;
  disabled: boolean;
  hidden: boolean;
  primary: boolean;
  format?: string;
  constraints?: FieldConstraints;
  value: FormValue | undefined;
  onChange: (value: FormValue) => void;
  error?: string;
};

export type FormController = {
  typeInfo: TypeInfo;
  typeTags?: TypeInfo["tags"];
  operation: TypeOperation;
  values: FormValues;
  errors: Record<string, string>;
  fields: FormFieldController[];
  setFieldValue: (key: string, value: FormValue) => void;
  validate: () => boolean;
};

export type RelationAction = "open" | "add" | "edit" | "remove";

export type RelationActionPayload = {
  action: RelationAction;
  fieldKey: string;
  field: TypeInfoField;
  value: ItemRelationshipInfoType | ItemRelationshipInfoType[] | undefined;
  index?: number;
  onChange: (value: FormValue) => void;
};

export type CustomTypeAction = "open" | "add" | "edit" | "remove";

export type CustomTypeActionPayload = {
  action: CustomTypeAction;
  fieldKey: string;
  field: TypeInfoField;
  customType: string;
  value: FormValue | undefined;
  index?: number;
  onChange: (value: FormValue) => void;
};
