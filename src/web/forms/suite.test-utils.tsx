/**
 * @packageDocumentation
 *
 * Test utilities for the default web form suite.
 */

import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { FieldRenderContext, FieldKind } from "../../app/forms/core";
import { webSuite } from "./suite";

const fieldKinds: FieldKind[] = [
  "string",
  "number",
  "boolean",
  "enum_select",
  "array",
  "relation_single",
  "relation_array",
  "custom_single",
  "custom_array",
];

/**
 * Ensure the web suite provides a renderer for every field kind.
 */
export const runWebSuiteCompletenessScenario = () => {
  const missingKinds = fieldKinds.filter(
    (kind) => !webSuite.renderers[kind],
  );

  return {
    missingKinds,
  };
};

/**
 * Validate a representative renderer output for the web suite.
 */
export const runWebSuiteStringRendererScenario = () => {
  const context: FieldRenderContext<ReactElement> = {
    field: {
      type: "string",
      array: false,
      readonly: false,
      optional: false,
      tags: { label: "Title" },
    },
    fieldKey: "title",
    label: "Title",
    required: true,
    disabled: false,
    translateValidationErrorCode: (error) => String(error.code),
    value: "Hello",
    onChange: () => undefined,
    renderField: () => <></>,
  };

  const element = webSuite.renderers.string?.(context);
  const html = renderToString(element as any);

  return {
    hasLabel: html.includes("Title"),
    hasInput: html.includes("type=\"text\""),
  };
};

/**
 * Validate web suite form root and submit button semantics.
 */
export const runWebSuiteFormSubmitScenario = () => {
  const primitives = webSuite.primitives as NonNullable<typeof webSuite.primitives>;
  let submitCalls = 0;
  let preventDefaultCalls = 0;
  let buttonClickCalls = 0;

  const rootElement = primitives.FormRoot?.({
    children: <div>Child</div>,
    onSubmit: () => {
      submitCalls += 1;
    },
  }) as any;

  rootElement.props.onSubmit({
    preventDefault: () => {
      preventDefaultCalls += 1;
    },
  });

  const submitButton = primitives.Button?.({
    children: <>Submit</>,
    type: "submit",
    onClick: () => {
      buttonClickCalls += 1;
    },
  }) as any;

  return {
    hasFormRoot: rootElement.type === "form",
    preventDefaultCalls,
    submitCalls,
    submitButtonType: submitButton.props.type ?? null,
    submitButtonOnClickIsUndefined: submitButton.props.onClick === undefined,
    buttonClickCalls,
  };
};
