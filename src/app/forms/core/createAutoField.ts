/**
 * @packageDocumentation
 *
 * Factory for AutoField that delegates rendering to a resolved suite.
 */

import type { TypeInfoField } from "../../../common/TypeParsing/TypeInfo";
import {
  ERROR_MESSAGE_CONSTANTS,
  getErrorDescriptor,
  type ErrorDescriptor,
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
export const createAutoField = <RenderOutput = unknown>(
  suite: ResolvedSuite<RenderOutput>,
) => {
  const defaultTranslateValidationErrorCode = (error: ErrorDescriptor): string =>
    error.code === ERROR_MESSAGE_CONSTANTS.NONE ? "" : String(error.code);

  const renderField = (props: AutoFieldInput): RenderOutput => {
    const { field, fieldKey, value, onChange, error, disabled } = props;
    const { tags } = field;

    const context: FieldRenderContext<RenderOutput> = {
      field,
      fieldKey,
      label: tags?.label ?? fieldKey,
      required: !field.optional,
      disabled: !!disabled,
      error: error ?? getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.NONE),
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
      renderField,
    };

    const kind = getFieldKind(field);
    return suite.renderers[kind](context);
  };

  return renderField;
};
