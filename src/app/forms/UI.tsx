/**
 * @packageDocumentation
 *
 * Shared AutoForm UI components driven by renderer suites.
 */

import type { ReactElement } from "react";
import { FC, type FormEvent, useEffect } from "react";
import type {
  TypeInfo,
  TypeOperation,
} from "../../common/TypeParsing/TypeInfo";
import {
  ERROR_MESSAGE_CONSTANTS,
  type ErrorDescriptor,
} from "../../common/TypeParsing/Validation";
import { useFormEngine } from "./Engine";
import type {
  AutoFieldProps,
  CustomTypeActionPayload,
  CustomValidatorMap,
  FormController,
  FormValues,
  RelationActionPayload,
  TranslateValidationErrorCode,
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
  /** Optional translator for validation error descriptors. */
  translateValidationErrorCode?: TranslateValidationErrorCode;
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
  translateValidationErrorCode = defaultTranslateValidationErrorCode,
}) => {
  const FormRoot = renderer.suite.primitives?.FormRoot ?? fallbackFormRoot;
  const Button = renderer.suite.primitives?.Button ?? fallbackButton;
  const AutoField = renderer.AutoField;

  const submit = () => {
    const validationResults = controller.validate();
    if (validationResults.valid) {
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
              errors={fieldController.errors}
              arrayItemErrorMap={fieldController.arrayItemErrorMap}
              translateValidationErrorCode={translateValidationErrorCode}
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
  /** Optional translator for validation error descriptors. */
  translateValidationErrorCode?: TranslateValidationErrorCode;
  /** Optional custom validators keyed by field name. */
  customValidatorMap?: CustomValidatorMap;
}

/**
 * Default translation from error descriptors to readable messages.
 */
export const defaultTranslateValidationErrorCode: TranslateValidationErrorCode =
  (error: ErrorDescriptor) => {
    const { code, values = [] } = error;
    const [constraintValue] = values;

    switch (code) {
      case ERROR_MESSAGE_CONSTANTS.INVALID_CUSTOM_TYPE:
        return "Value failed custom validation";
      case ERROR_MESSAGE_CONSTANTS.NOT_A_STRING:
        return "Value must be a string";
      case ERROR_MESSAGE_CONSTANTS.NOT_A_NUMBER:
        return "Value must be a number";
      case ERROR_MESSAGE_CONSTANTS.NOT_A_BOOLEAN:
        return "Value must be a boolean";
      case ERROR_MESSAGE_CONSTANTS.DENIED_TYPE_OPERATION_CREATE:
        return "Create operation is not allowed for this value";
      case ERROR_MESSAGE_CONSTANTS.DENIED_TYPE_OPERATION_READ:
        return "Read operation is not allowed for this value";
      case ERROR_MESSAGE_CONSTANTS.DENIED_TYPE_OPERATION_UPDATE:
        return "Update operation is not allowed for this value";
      case ERROR_MESSAGE_CONSTANTS.DENIED_TYPE_OPERATION_DELETE:
        return "Delete operation is not allowed for this value";
      case ERROR_MESSAGE_CONSTANTS.MISSING_FIELD_VALUE:
        return "This field is required";
      case ERROR_MESSAGE_CONSTANTS.INVALID_FIELD:
        return "This field is not allowed";
      case ERROR_MESSAGE_CONSTANTS.VALUE_DOES_NOT_MATCH_PATTERN:
        return "Value does not match required pattern";
      case ERROR_MESSAGE_CONSTANTS.INVALID_PATTERN:
        return "Field pattern configuration is invalid";
      case ERROR_MESSAGE_CONSTANTS.VALUE_BELOW_MINIMUM:
        return `Value must be at least ${constraintValue ?? "the minimum"}`;
      case ERROR_MESSAGE_CONSTANTS.VALUE_ABOVE_MAXIMUM:
        return `Value must be at most ${constraintValue ?? "the maximum"}`;
      case ERROR_MESSAGE_CONSTANTS.INVALID_OPTION:
        return "Value is not one of the allowed options";
      case ERROR_MESSAGE_CONSTANTS.RELATIONSHIP_VALUES_ARE_STRICTLY_EXCLUDED:
        return "Relationship values are not allowed for this operation";
      case ERROR_MESSAGE_CONSTANTS.NO_UNION_TYPE_MATCHED:
        return "Value does not match any allowed shape";
      case ERROR_MESSAGE_CONSTANTS.TYPE_DOES_NOT_EXIST:
        return "Type definition was not found";
      case ERROR_MESSAGE_CONSTANTS.INVALID_TYPE:
        return "Value has an invalid type";
      case ERROR_MESSAGE_CONSTANTS.NONE:
        return "";
      default:
        return String(code);
    }
  };

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
  translateValidationErrorCode = defaultTranslateValidationErrorCode,
  customValidatorMap,
}) => {
  const controller = useFormEngine(initialValues, typeInfo, {
    operation,
    customValidatorMap,
  });

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
      translateValidationErrorCode={translateValidationErrorCode}
    />
  );
};
