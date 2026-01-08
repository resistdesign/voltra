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

/**
 * Loose map of form values keyed by field.
 */
export type FormValues = Partial<TypeInfoDataItem>;

/**
 * Value type for a single form field.
 */
export type FormValue = TypeInfoDataItem[keyof TypeInfoDataItem];

/**
 * Constraints extracted from TypeInfo field tags.
 */
type FieldConstraints = NonNullable<TypeInfoField["tags"]>["constraints"];

/**
 * Props for primitive input components.
 */
export interface PrimitiveInputProps<T = unknown> {
  /** Current value for the input. */
  value: T;
  /** Callback invoked when the value changes. */
  onChange: (value: T) => void;
  /** Optional DOM id applied to the input. */
  id?: string;
  /** Placeholder text shown when the input is empty. */
  placeholder?: string;
  /** Disables the input when true. */
  disabled?: boolean;
  /** Flags the input as invalid for styling. */
  hasError?: boolean;
}

/**
 * Props for the AutoField component.
 */
export interface AutoFieldProps {
  /** Type info describing the field to render. */
  field: TypeInfoField;
  /** Key that identifies the field in the form values. */
  fieldKey: string;
  /** Current value for the field. */
  value: FormValue | undefined;
  /** Change handler for the field value. */
  onChange: (value: FormValue) => void;
  /** Optional error message to display under the field. */
  error?: string;
  /** Disables the field UI when true. */
  disabled?: boolean;
  /** Optional callback for relation actions. */
  onRelationAction?: (payload: RelationActionPayload) => void;
  /** Optional callback for custom type actions. */
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
}

/**
 * Controller metadata for a single field instance.
 */
export type FormFieldController = {
  /** Field key as defined in the TypeInfo map. */
  key: string;
  /** Field metadata from the type info. */
  field: TypeInfoField;
  /** Display label for the field. */
  label: string;
  /** True when the field must be provided. */
  required: boolean;
  /** True when the field UI should be disabled. */
  disabled: boolean;
  /** True when the field should be hidden from view. */
  hidden: boolean;
  /** True when the field is the primary identifier. */
  primary: boolean;
  /** Optional format hint for the field. */
  format?: string;
  /** Optional validation and UI constraints. */
  constraints?: FieldConstraints;
  /** Current value for the field. */
  value: FormValue | undefined;
  /** Change handler for the field value. */
  onChange: (value: FormValue) => void;
  /** Optional error message for the field. */
  error?: string;
};

/**
 * Controller for a form instance and its fields.
 */
export type FormController = {
  /** Type metadata used to build the form. */
  typeInfo: TypeInfo;
  /** Optional type-level tags from the metadata. */
  typeTags?: TypeInfo["tags"];
  /** Active operation driving field state. */
  operation: TypeOperation;
  /** Current form values keyed by field. */
  values: FormValues;
  /** Validation errors keyed by field. */
  errors: Record<string, string>;
  /** Derived controllers for each field. */
  fields: FormFieldController[];
  /** Update a field value by key. */
  setFieldValue: (key: string, value: FormValue) => void;
  /** Validate the form and return success. */
  validate: () => boolean;
};

/**
 * Supported relation actions emitted by fields.
 */
export type RelationAction = "open" | "add" | "edit" | "remove";

/**
 * Payload for relation action callbacks.
 */
export type RelationActionPayload = {
  /** Relation action to perform. */
  action: RelationAction;
  /** Field key that initiated the action. */
  fieldKey: string;
  /** Field metadata for the relation. */
  field: TypeInfoField;
  /** Current relation value for the field. */
  value: ItemRelationshipInfoType | ItemRelationshipInfoType[] | undefined;
  /** Whether relation selection should use full paging. */
  fullPaging?: boolean;
  /** Index when acting on an array item. */
  index?: number;
  /** Change handler to update the relation value. */
  onChange: (value: FormValue) => void;
};

/**
 * Supported actions for custom type handlers.
 */
export type CustomTypeAction = "open" | "add" | "edit" | "remove";

/**
 * Payload for custom type action callbacks.
 */
export type CustomTypeActionPayload = {
  /** Custom type action to perform. */
  action: CustomTypeAction;
  /** Field key that initiated the action. */
  fieldKey: string;
  /** Field metadata for the custom type. */
  field: TypeInfoField;
  /** Custom type identifier. */
  customType: string;
  /** Current value for the custom type. */
  value: FormValue | undefined;
  /** Index when acting on an array item. */
  index?: number;
  /** Change handler to update the custom value. */
  onChange: (value: FormValue) => void;
};
