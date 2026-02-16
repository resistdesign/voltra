/**
 * @packageDocumentation
 *
 * Test helpers and scenarios for shared form UI components.
 */

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo";
import type {
  AutoFieldProps,
  FormController,
  FormValues,
} from "./types";
import { AutoFormView, type AutoFormRenderer } from "./UI";

const createController = (
  options?: Partial<FormController> & { validateResult?: boolean },
): FormController => {
  const validateResult = options?.validateResult ?? true;
  return {
    typeInfo: { fields: {} },
    operation: TypeOperation.CREATE,
    values: {},
    errors: {},
    fields: [],
    setFieldValue: () => {},
    validate: () => validateResult,
    setErrors: () => {},
    ...options,
  };
};

const createRenderer = (options?: {
  autoClickSubmit?: boolean;
  onFormRootProps?: (props: { onSubmit?: () => void }) => void;
  onButtonProps?: (props: {
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit";
  }) => void;
}): AutoFormRenderer => {
  const AutoField = (props: AutoFieldProps) =>
    createElement("div", { "data-field": props.fieldKey }, props.fieldKey);

  return {
    AutoField,
    suite: {
      renderers: {} as any,
      primitives: {
        FormRoot: (props) => {
          options?.onFormRootProps?.({ onSubmit: props.onSubmit });
          return createElement("div", null, props.children);
        },
        Button: (props) => {
          options?.onButtonProps?.({
            disabled: props.disabled,
            onClick: props.onClick,
            type: props.type,
          });
          if (options?.autoClickSubmit && props.type === "submit") {
            props.onClick?.();
          }
          return createElement(
            "button",
            { disabled: props.disabled, type: props.type },
            props.children,
          );
        },
      },
    },
  };
};

/**
 * Validate AutoFormView calls controller.validate and only submits when valid.
 *
 * @returns Validation/submit call assertions.
 */
export const runSharedSubmitValidationScenario = () => {
  let invalidValidateCalls = 0;
  let invalidSubmitCalls = 0;

  const invalidController = createController({
    validate: () => {
      invalidValidateCalls += 1;
      return false;
    },
    values: { name: "invalid" },
  });

  renderToString(
    createElement(AutoFormView, {
      controller: invalidController,
      onSubmit: () => {
        invalidSubmitCalls += 1;
      },
      renderer: createRenderer({ autoClickSubmit: true }),
    }),
  );

  let validValidateCalls = 0;
  let validSubmitCalls = 0;
  let submittedValues: FormValues | null = null;

  const validController = createController({
    validate: () => {
      validValidateCalls += 1;
      return true;
    },
    values: { name: "valid" },
  });

  renderToString(
    createElement(AutoFormView, {
      controller: validController,
      onSubmit: (values) => {
        validSubmitCalls += 1;
        submittedValues = values;
      },
      renderer: createRenderer({ autoClickSubmit: true }),
    }),
  );

  return {
    invalidValidateCalls,
    invalidSubmitCalls,
    validValidateCalls,
    validSubmitCalls,
    submittedName: (submittedValues as Record<string, unknown> | null)?.name ?? null,
  };
};

/**
 * Validate hidden fields are omitted from shared AutoFormView output.
 *
 * @returns Render assertions for hidden vs visible field keys.
 */
export const runSharedHiddenFieldScenario = () => {
  const controller = createController({
    fields: [
      {
        key: "visible",
        field: {
          type: "string",
          array: false,
          readonly: false,
          optional: true,
        },
        label: "Visible",
        required: false,
        disabled: false,
        hidden: false,
        primary: false,
        value: undefined,
        onChange: () => {},
      },
      {
        key: "secret",
        field: {
          type: "string",
          array: false,
          readonly: false,
          optional: true,
        },
        label: "Secret",
        required: false,
        disabled: false,
        hidden: true,
        primary: false,
        value: undefined,
        onChange: () => {},
      },
    ],
  });

  const html = renderToString(
    createElement(AutoFormView, {
      controller,
      onSubmit: () => {},
      renderer: createRenderer(),
    }),
  );

  return {
    hasVisibleField: html.includes('data-field="visible"'),
    hasHiddenField: html.includes('data-field="secret"'),
  };
};

/**
 * Validate submitDisabled is passed to the suite button primitive.
 *
 * @returns Whether disabled state reached the button primitive.
 */
export const runSharedSubmitDisabledScenario = () => {
  let capturedDisabled: boolean | undefined;
  const controller = createController();

  renderToString(
    createElement(AutoFormView, {
      controller,
      onSubmit: () => {},
      submitDisabled: true,
      renderer: createRenderer({
        onButtonProps: (props) => {
          capturedDisabled = props.disabled;
        },
      }),
    }),
  );

  return {
    submitDisabledPropagated: capturedDisabled ?? false,
  };
};

/**
 * Validate AutoFormView uses suite FormRoot and suite Button primitives.
 *
 * @returns Primitive usage and submit wiring assertions.
 */
export const runSharedSuitePrimitiveUsageScenario = () => {
  let capturedFormRootSubmit: (() => void) | undefined;
  let capturedButtonType: "button" | "submit" | undefined;
  let capturedButtonOnClick: (() => void) | undefined;
  let submitCalls = 0;

  const controller = createController({
    validate: () => true,
    values: { title: "Hello" },
  });

  renderToString(
    createElement(AutoFormView, {
      controller,
      onSubmit: () => {
        submitCalls += 1;
      },
      renderer: createRenderer({
        onFormRootProps: (props) => {
          capturedFormRootSubmit = props.onSubmit;
        },
        onButtonProps: (props) => {
          capturedButtonType = props.type;
          capturedButtonOnClick = props.onClick;
        },
      }),
    }),
  );

  capturedFormRootSubmit?.();
  capturedButtonOnClick?.();

  return {
    hasFormRootSubmit: typeof capturedFormRootSubmit === "function",
    buttonTypeIsSubmit: capturedButtonType === "submit",
    hasButtonOnClick: typeof capturedButtonOnClick === "function",
    submitCalls,
  };
};
