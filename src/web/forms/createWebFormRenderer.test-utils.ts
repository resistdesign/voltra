/**
 * @packageDocumentation
 *
 * Test utilities for createWebFormRenderer.
 */

import { withRendererOverride } from "../../app/forms/core/mergeSuites";
import { createWebFormRenderer } from "./createWebFormRenderer";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Validate that web renderer honors overrides.
 */
export const runCreateWebFormRendererOverrideScenario = () => {
  const renderer = createWebFormRenderer({
    suite: withRendererOverride(
      "string",
      () => createElement("span", { "data-kind": "override" }) as any,
    ),
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

/**
 * Validate that web renderer defaults to the built-in web suite when no override is provided.
 */
export const runCreateWebFormRendererDefaultScenario = () => {
  const renderer = createWebFormRenderer();
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
    hasDefaultInput: html.includes("<input"),
  };
};
