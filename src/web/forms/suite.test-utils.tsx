/**
 * @packageDocumentation
 *
 * Test utilities for the default web form suite.
 */

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
  const context: FieldRenderContext = {
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
    value: "Hello",
    onChange: () => undefined,
  };

  const element = webSuite.renderers.string?.(context);
  const html = renderToString(element as any);

  return {
    hasLabel: html.includes("Title"),
    hasInput: html.includes("type=\"text\""),
  };
};
