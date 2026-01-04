/**
 * @packageDocumentation
 *
 * Types for the form generation system.
 */

import type {
  TypeInfo,
  TypeInfoField,
} from "../../common/TypeParsing/TypeInfo.js";

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
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
  onRelationAction?: (payload: RelationActionPayload) => void;
}

export type FormFieldController = {
  key: string;
  field: TypeInfoField;
  label: string;
  required: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
};

export type FormController = {
  typeInfo: TypeInfo;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  fields: FormFieldController[];
  setFieldValue: (key: string, value: unknown) => void;
  validate: () => boolean;
};

export type RelationAction = "open" | "add" | "edit" | "remove";

export type RelationActionPayload = {
  action: RelationAction;
  fieldKey: string;
  field: TypeInfoField;
  value: unknown;
  index?: number;
  onChange: (value: unknown) => void;
};
