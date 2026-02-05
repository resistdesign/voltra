/**
 * @packageDocumentation
 *
 * Tier 2 UI components: AutoForm, AutoField.
 */

import { FC, FormEvent, useEffect } from "react";
import type { TypeInfo, TypeOperation } from "../../common/TypeParsing/TypeInfo";
import type {
  AutoFieldProps,
  CustomTypeActionPayload,
  FormController,
  FormValues,
  RelationActionPayload,
} from "../../app/forms/types";
import { useFormEngine } from "../../app/forms/Engine";
import { webAutoField } from "./suite";
import styled from "../../app/helpers/styled";

/**
 * Render a form field based on TypeInfo metadata.
 *
 * @param props - AutoField props describing the field and handlers.
 * @returns Rendered field UI.
 */
export const AutoField: FC<AutoFieldProps> = (props) => {
  return webAutoField({
    field: props.field,
    fieldKey: props.fieldKey,
    value: props.value,
    onChange: props.onChange,
    error: props.error,
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
}

/**
 * Render a form UI from a prepared form controller.
 *
 * @param props - View props including controller and callbacks.
 * @returns Rendered form view.
 */
export const AutoFormView: FC<AutoFormViewProps> = ({
  controller,
  onSubmit,
  submitDisabled,
  onRelationAction,
  onCustomTypeAction,
}) => {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (controller.validate()) {
      onSubmit(controller.values);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      {controller.fields
        .filter((fieldController) => !fieldController.hidden)
        .map((fieldController) => (
          <AutoField
            key={fieldController.key}
            field={fieldController.field}
            fieldKey={fieldController.key}
            value={fieldController.value}
            onChange={fieldController.onChange}
            error={fieldController.error}
            onRelationAction={onRelationAction}
            disabled={fieldController.disabled}
            onCustomTypeAction={onCustomTypeAction}
          />
        ))}
      <button type="submit" disabled={submitDisabled}>
        Submit
      </button>
    </FormContainer>
  );
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
}

/**
 * Build a controller from type metadata and render an auto form.
 *
 * @param props - Auto form props including type info and callbacks.
 * @returns Rendered form bound to a new controller.
 */
export const AutoForm: FC<AutoFormProps> = ({
  typeInfo,
  onSubmit,
  initialValues,
  onValuesChange,
  onRelationAction,
  onCustomTypeAction,
  operation,
  submitDisabled,
}) => {
  const controller = useFormEngine(initialValues, typeInfo, { operation });

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(controller.values);
    }
  }, [controller.values, onValuesChange]);

  return (
    <AutoFormView
      controller={controller}
      onSubmit={onSubmit}
      onRelationAction={onRelationAction}
      onCustomTypeAction={onCustomTypeAction}
      submitDisabled={submitDisabled}
    />
  );
};

const FormContainer = styled("form")`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 1em;
`;
