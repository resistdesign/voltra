/**
 * @packageDocumentation
 *
 * Factory for AutoField that delegates rendering to a resolved suite.
 */

import { createElement, type FC, type ReactElement } from "react";
import type { TypeInfoField } from "../../../common/TypeParsing/TypeInfo";
import {
  ERROR_MESSAGE_CONSTANTS,
  getErrorDescriptor,
  type ErrorDescriptor,
  type ArrayItemErrorMap,
} from "../../../common/TypeParsing/Validation";
import { getFieldKind } from "./getFieldKind";
import type {
  CustomTypeActionPayload,
  FieldRenderContext,
  FieldValue,
  RelationActionPayload,
  ResolvedSuite,
} from "./types";

/**
 * Input props for AutoField render delegation.
 */
export type AutoFieldInput = {
  /** Type info describing the field to render. */
  field: TypeInfoField;
  /** Key that identifies the field in the form values. */
  fieldKey: string;
  /** Current value for the field. */
  value: FieldValue | undefined;
  /** Change handler for the field value. */
  onChange: (value: FieldValue) => void;
  /** Optional error descriptor to display under the field. */
  error?: ErrorDescriptor;
  /** Optional value-level errors for the field. */
  errors?: ErrorDescriptor[];
  /** Optional per-index errors for array fields. */
  arrayItemErrorMap?: ArrayItemErrorMap;
  /** Optional translator for validation error descriptors. */
  translateValidationErrorCode?: (error: ErrorDescriptor) => string;
  /** Disables the field UI when true. */
  disabled?: boolean;
  /** Optional callback for relation actions. */
  onRelationAction?: (payload: RelationActionPayload) => void;
  /** Optional callback for custom type actions. */
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
};

/**
 * Create an AutoField renderer that delegates to a resolved suite.
 *
 * @param suite - Resolved component suite.
 * @returns AutoField renderer function.
 */
export const createAutoField = <RenderOutput = ReactElement>(
  suite: ResolvedSuite<RenderOutput>,
) => {
  const defaultTranslateValidationErrorCode = (error: ErrorDescriptor): string =>
    error.code === ERROR_MESSAGE_CONSTANTS.NONE ? "" : String(error.code);

  const AutoField: FC<AutoFieldInput> = (props) => {
    const { field, fieldKey, value, onChange, error, disabled } = props;
    const { tags } = field;
    const resolvedErrors = props.errors ?? (error ? [error] : []);
    const resolvedError =
      resolvedErrors.find((descriptor) => descriptor.code !== ERROR_MESSAGE_CONSTANTS.NONE) ??
      getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.NONE);

    const context: FieldRenderContext<RenderOutput> = {
      field,
      fieldKey,
      label: tags?.label ?? fieldKey,
      required: !field.optional,
      disabled: !!disabled,
      error: resolvedError,
      errors: resolvedErrors,
      arrayItemErrorMap: props.arrayItemErrorMap,
      translateValidationErrorCode:
        props.translateValidationErrorCode ?? defaultTranslateValidationErrorCode,
      value,
      onChange,
      constraints: tags?.constraints,
      format: tags?.format,
      possibleValues: field.possibleValues,
      allowCustomSelection: tags?.allowCustomSelection,
      customType: tags?.customType,
      onRelationAction: props.onRelationAction,
      onCustomTypeAction: props.onCustomTypeAction,
      renderField: (input) =>
        createElement(AutoField, {
          field: input.field,
          fieldKey: input.fieldKey,
          value: input.value,
          onChange: input.onChange,
          error: input.error,
          errors: input.errors,
          arrayItemErrorMap: input.arrayItemErrorMap,
          translateValidationErrorCode: input.translateValidationErrorCode,
          disabled: input.disabled,
          onRelationAction: input.onRelationAction,
          onCustomTypeAction: input.onCustomTypeAction,
        }) as RenderOutput,
    };

    const kind = getFieldKind(field);
    return createElement(suite.renderers[kind], context);
  };

  return AutoField;
};
