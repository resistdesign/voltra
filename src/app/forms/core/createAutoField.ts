/**
 * @packageDocumentation
 *
 * Factory for AutoField that delegates rendering to a resolved suite.
 */

import type { TypeInfoField } from "../../../common/TypeParsing/TypeInfo";
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
  /** Optional error message to display under the field. */
  error?: string;
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
  return (props: AutoFieldInput): RenderOutput => {
    const { field, fieldKey, value, onChange, error, disabled } = props;
    const { tags } = field;

    const context: FieldRenderContext = {
      field,
      fieldKey,
      label: tags?.label ?? fieldKey,
      required: !field.optional,
      disabled: !!disabled,
      error,
      value,
      onChange,
      constraints: tags?.constraints,
      format: tags?.format,
      possibleValues: field.possibleValues,
      allowCustomSelection: tags?.allowCustomSelection,
      customType: tags?.customType,
      onRelationAction: props.onRelationAction,
      onCustomTypeAction: props.onCustomTypeAction,
    };

    const kind = getFieldKind(field);
    return suite.renderers[kind](context);
  };
};
