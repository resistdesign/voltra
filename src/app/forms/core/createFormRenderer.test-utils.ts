/**
 * @packageDocumentation
 *
 * Test utilities for createFormRenderer.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentSuite } from "./types";
import { createFormRenderer } from "./createFormRenderer";

const fallbackSuite: ComponentSuite = {
  renderers: {
    string: () => createElement("span", { "data-kind": "string" }),
    number: () => createElement("span", { "data-kind": "number" }),
    boolean: () => createElement("span", { "data-kind": "boolean" }),
    enum_select: () => createElement("span", { "data-kind": "enum" }),
    array: () => createElement("span", { "data-kind": "array" }),
    relation_single: () =>
      createElement("span", { "data-kind": "relation_single" }),
    relation_array: () =>
      createElement("span", { "data-kind": "relation_array" }),
    custom_single: () => createElement("span", { "data-kind": "custom_single" }),
    custom_array: () => createElement("span", { "data-kind": "custom_array" }),
  },
};

/**
 * Validate that form renderer uses fallback suite when no overrides provided.
 */
export const runCreateFormRendererFallbackScenario = () => {
  const renderer = createFormRenderer({ fallbackSuite });
  const html = renderToStaticMarkup(
    createElement(renderer.AutoField, {
      field: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      fieldKey: "title",
      value: "Hello",
      onChange: () => undefined,
    }),
  );

  return {
    stringKind: html.includes("data-kind=\"string\""),
  };
};

/**
 * Validate that overrides take precedence over fallback.
 */
export const runCreateFormRendererOverrideScenario = () => {
  const renderer = createFormRenderer({
    fallbackSuite,
    suite: {
      renderers: {
        string: () => createElement("span", { "data-kind": "override" }),
      },
    },
  });
  const html = renderToStaticMarkup(
    createElement(renderer.AutoField, {
      field: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      fieldKey: "title",
      value: "Hello",
      onChange: () => undefined,
    }),
  );

  return {
    stringKind: html.includes("data-kind=\"override\""),
  };
};
