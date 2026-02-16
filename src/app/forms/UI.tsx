/**
 * @packageDocumentation
 *
 * Shared AutoForm UI components driven by renderer suites.
 */

import { FC, type FormEvent, useEffect } from "react";
import type { ReactElement } from "react";
import type { TypeInfo, TypeOperation } from "../../common/TypeParsing/TypeInfo";
import { useFormEngine } from "./Engine";
import type {
  AutoFieldProps,
  CustomTypeActionPayload,
  FormController,
  FormValues,
  RelationActionPayload,
} from "./types";
import type { ResolvedSuite } from "./core/types";

/**
 * Renderer contract used by shared AutoForm components.
 */
export interface AutoFormRenderer {
  /** Suite-backed field component for each field controller. */
  AutoField: FC<AutoFieldProps>;
  /** Resolved suite that provides primitives for container controls. */
  suite: ResolvedSuite<ReactElement>;
}

/**
 * Props for the shared AutoFormView component.
 */
export interface AutoFormViewProps {
  /** Prepared controller that supplies field state. */
  controller: FormController;
  /** Submit handler invoked with validated form values. */
  onSubmit: (values: FormValues) => void;
  /** Renderer containing AutoField and suite primitives. */
  renderer: AutoFormRenderer;
  /** Disable the submit button when true. */
  submitDisabled?: boolean;
  /** Optional relation action handler for reference fields. */
  onRelationAction?: (payload: RelationActionPayload) => void;
  /** Optional custom type action handler. */
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
}

const fallbackFormRoot = ({
  children,
  onSubmit,
}: {
  children: ReactElement;
  onSubmit?: () => void;
}) => {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };

  return <form onSubmit={handleSubmit}>{children}</form>;
};

const fallbackButton = ({
  children,
  disabled,
  type,
  onClick,
}: {
  children: ReactElement;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) => {
  return (
    <button type={type ?? "button"} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
};

/**
 * Render a form UI from a prepared form controller.
 *
 * @param props - View props including controller and callbacks.
 * @returns Rendered form view.
 */
export const AutoFormView: FC<AutoFormViewProps> = ({
  controller,
  onSubmit,
  renderer,
  submitDisabled,
  onRelationAction,
  onCustomTypeAction,
}) => {
  const FormRoot = renderer.suite.primitives?.FormRoot ?? fallbackFormRoot;
  const Button = renderer.suite.primitives?.Button ?? fallbackButton;
  const AutoField = renderer.AutoField;

  const submit = () => {
    if (controller.validate()) {
      onSubmit(controller.values);
    }
  };

  return (
    <FormRoot onSubmit={submit}>
      <>
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
        <Button type="submit" onClick={submit} disabled={submitDisabled}>
          <>Submit</>
        </Button>
      </>
    </FormRoot>
  );
};

/**
 * Props for the shared AutoForm component.
 */
export interface AutoFormProps {
  /** Type metadata used to build the form. */
  typeInfo: TypeInfo;
  /** Submit handler invoked with validated form values. */
  onSubmit: (values: FormValues) => void;
  /** Renderer containing AutoField and suite primitives. */
  renderer: AutoFormRenderer;
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
  renderer,
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
      renderer={renderer}
      onRelationAction={onRelationAction}
      onCustomTypeAction={onCustomTypeAction}
      submitDisabled={submitDisabled}
    />
  );
};
