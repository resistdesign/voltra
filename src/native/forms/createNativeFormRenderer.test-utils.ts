/**
 * @packageDocumentation
 *
 * Test utilities for createNativeFormRenderer.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { withRendererOverride } from "../../app/forms/core/mergeSuites";
import { createNativeFormRenderer } from "./createNativeFormRenderer";
import { AutoField as NativeAutoField } from "./UI";

/**
 * Validate that native renderer honors suite overrides.
 */
export const runNativeCreateFormRendererOverrideScenario = () => {
  const renderer = createNativeFormRenderer({
    suite: withRendererOverride(
      "string",
      () => createElement("span", { "data-kind": "native-override" }) as any,
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
    hasOverride: html.includes("native-override"),
  };
};

/**
 * Validate that native renderer defaults to the built-in native suite when no override is provided.
 */
export const runNativeCreateFormRendererDefaultScenario = () => {
  const renderer = createNativeFormRenderer();
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
    hasDefaultTextInput: html.includes("TextInput"),
  };
};

/**
 * Validate native AutoField wrapper renders through the component pipeline.
 */
export const runNativeAutoFieldWrapperScenario = () => {
  const html = renderToStaticMarkup(
    createElement(NativeAutoField, {
      field: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      fieldKey: "title",
      value: "Hello",
      onChange: () => undefined,
    } as any),
  );

  return {
    hasTextInput: html.includes("TextInput"),
  };
};
