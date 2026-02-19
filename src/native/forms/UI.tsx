/**
 * @packageDocumentation
 *
 * Native AutoForm wrappers backed by the default native renderer.
 */

import { createElement, type FC } from "react";
import type {
  AutoFieldProps,
  CustomValidatorMap,
  CustomTypeActionPayload,
  FormController,
  FormValues,
  RelationActionPayload,
  TranslateValidationErrorCode,
} from "../../app/forms/types";
import type { TypeInfo, TypeOperation } from "../../common/TypeParsing/TypeInfo";
import { AutoForm as SharedAutoForm, AutoFormView as SharedAutoFormView } from "../../app/forms/UI";
import { createNativeFormRenderer } from "./createNativeFormRenderer";
import { nativeAutoField } from "./suite";

const defaultNativeRenderer = createNativeFormRenderer();

/**
 * Render a form field based on TypeInfo metadata.
 *
 * @category Forms
 *
 * @param props - AutoField props describing the field and handlers.
 * @returns Rendered field UI.
 */
export const AutoField: FC<AutoFieldProps> = (props) => {
  return createElement(nativeAutoField, {
    field: props.field,
    fieldKey: props.fieldKey,
    value: props.value,
    onChange: props.onChange,
    error: props.error,
    errors: props.errors,
    arrayItemErrorMap: props.arrayItemErrorMap,
    translateValidationErrorCode: props.translateValidationErrorCode,
    disabled: props.disabled,
    onRelationAction: props.onRelationAction,
    onCustomTypeAction: props.onCustomTypeAction,
  });
};

/**
 * Props for the AutoFormView component.
 */
export interface AutoFormViewProps {
  /** Prepared controller that supplies field state. */
  controller: FormController;
  /** Submit handler invoked with validated form values. */
  onSubmit: (values: FormValues) => void;
  /** Disable the submit button when true. */
  submitDisabled?: boolean;
  /** Optional relation action handler for reference fields. */
  onRelationAction?: (payload: RelationActionPayload) => void;
  /** Optional custom type action handler. */
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
  /** Optional translator for validation error descriptors. */
  translateValidationErrorCode?: TranslateValidationErrorCode;
}

/**
 * Render a native form UI from a prepared form controller.
 *
 * @param props - View props including controller and callbacks.
 * @returns Rendered form view.
 */
export const AutoFormView: FC<AutoFormViewProps> = (props) => {
  return <SharedAutoFormView {...props} renderer={defaultNativeRenderer} />;
};

/**
 * Props for the AutoForm component.
 */
export interface AutoFormProps {
  /** Type metadata used to build the form. */
  typeInfo: TypeInfo;
  /** Submit handler invoked with validated form values. */
  onSubmit: (values: FormValues) => void;
  /** Optional initial values applied before defaults. */
  initialValues?: FormValues;
  /** Optional change handler invoked when values update. */
  onValuesChange?: (values: FormValues) => void;
  /** Optional relation action handler for reference fields. */
  onRelationAction?: (payload: RelationActionPayload) => void;
  /** Optional custom type action handler. */
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
  /** Optional operation override for field state. */
  operation?: TypeOperation;
  /** Disable the submit button when true. */
  submitDisabled?: boolean;
  /** Optional translator for validation error descriptors. */
  translateValidationErrorCode?: TranslateValidationErrorCode;
  /** Optional custom validators keyed by field name. */
  customValidatorMap?: CustomValidatorMap;
}

/**
 * Build a controller from type metadata and render a native auto form.
 *
 * @param props - Auto form props including type info and callbacks.
 * @returns Rendered native form.
 */
export const AutoForm: FC<AutoFormProps> = (props) => {
  return <SharedAutoForm {...props} renderer={defaultNativeRenderer} />;
};
