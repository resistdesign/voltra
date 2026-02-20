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
import type {
  ArrayErrorDescriptorCollection,
  ArrayItemErrorMap,
  ErrorDescriptor,
  FieldValueValidatorMap,
  TypeInfoValidationResults,
} from "../../common/TypeParsing/Validation";
import type {
  CustomTypeActionPayload,
  RelationActionPayload,
} from "./core/types";

export * from "./core/types";

/**
 * Translates validation error descriptors into UI messages.
 */
export type TranslateValidationErrorCode = (
  error: ErrorDescriptor,
) => string;

/**
 * Optional custom field validators keyed by field name.
 */
export type CustomValidatorMap = FieldValueValidatorMap;

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
  /** Optional primary error descriptor for convenience/backward compatibility. */
  error?: ErrorDescriptor;
  /** Optional list of value-level errors for the field. */
  errors?: ErrorDescriptor[];
  /** Optional per-index errors for array fields. */
  arrayItemErrorMap?: ArrayItemErrorMap;
  /** Optional translator from error descriptor to user-facing message. */
  translateValidationErrorCode?: TranslateValidationErrorCode;
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
  /** Optional primary error descriptor for the field. */
  error?: ErrorDescriptor;
  /** Optional list of value-level errors for the field. */
  errors?: ErrorDescriptor[];
  /** Optional per-index errors for array fields. */
  arrayItemErrorMap?: ArrayItemErrorMap;
};

/**
 * Validation errors keyed by field and represented as descriptors/codes.
 */
export type FormErrorMap = Record<
  string,
  (ErrorDescriptor | ArrayErrorDescriptorCollection)[]
>;

/**
 * Input map used to set form errors, accepting descriptors or raw codes.
 */
export type FormErrorInputMap = Record<
  string,
  | ErrorDescriptor
  | string
  | ErrorDescriptor[]
  | ArrayItemErrorMap
  | (ErrorDescriptor | ArrayErrorDescriptorCollection)[]
>;

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
  errors: FormErrorMap;
  /** Derived controllers for each field. */
  fields: FormFieldController[];
  /** Update a field value by key. */
  setFieldValue: (key: string, value: FormValue) => void;
  /** Validate the form and return success. */
  validate: () => TypeInfoValidationResults;
  /** Override form errors with a provided map. */
  setErrors: (errors: FormErrorInputMap) => void;
};
