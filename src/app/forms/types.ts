/**
 * @packageDocumentation
 *
 * Types for the form generation system.
 */

import { FC, ReactNode } from "react";

/**
 * Basic scalar types supported by the form system.
 */
export type ScalarType = "string" | "number" | "boolean";

/**
 * Schema metadata for a single field used by the engine.
 */
export interface FieldMetadata {
  key: string;
  label: string;
  type: ScalarType | "object" | "array";
  required?: boolean;
  description?: string;
  // For 'object' type
  fields?: Record<string, FieldMetadata>;
  // For 'array' type
  itemMetadata?: FieldMetadata;
  // For enums/unions
  allowedValues?: (string | number)[];
  allowCustom?: boolean;
}

/**
 * The normalized schema for a form.
 */
export interface FormMetadata {
  rootFields: Record<string, FieldMetadata>;
}

/**
 * Props for primitive input components.
 */
export interface PrimitiveInputProps<T = any> {
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
  metadata: FieldMetadata;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}
