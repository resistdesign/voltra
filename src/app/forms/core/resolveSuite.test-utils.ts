/**
 * @packageDocumentation
 *
 * Test utilities for resolveSuite.
 */

import type { ComponentSuite } from "./types";
import { resolveSuite } from "./resolveSuite";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

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
  primitives: {
    Button: () => createElement("span", { "data-kind": "button" }),
  },
};

/**
 * Override a single renderer and ensure fallback coverage remains.
 */
export const runResolveSuiteOverrideScenario = () => {
  const suite = resolveSuite(
    {
      renderers: {
        string: () => createElement("span", { "data-kind": "override_string" }),
      },
    },
    fallbackSuite,
  );

  return {
    stringRenderer: renderToStaticMarkup(createElement(suite.renderers.string, {} as any)).includes(
      "override_string",
    ),
    numberRenderer: renderToStaticMarkup(createElement(suite.renderers.number, {} as any)).includes(
      "number",
    ),
  };
};

/**
 * Override only primitives and ensure renderers remain intact.
 */
export const runResolveSuitePrimitiveScenario = () => {
  const suite = resolveSuite(
    {
      renderers: {},
      primitives: {
        Button: () => createElement("span", { "data-kind": "override_button" }),
      },
    },
    fallbackSuite,
  );

  return {
    buttonPrimitive:
      renderToStaticMarkup(createElement(suite.primitives?.Button as any, {} as any)).includes(
        "override_button",
      ) ?? null,
    stringRenderer: renderToStaticMarkup(createElement(suite.renderers.string, {} as any)).includes(
      "string",
    ),
  };
};

/**
 * Ensure missing renderers throw with a helpful message.
 */
export const runResolveSuiteMissingScenario = () => {
  try {
    resolveSuite(
      {
        renderers: {
          string: () => createElement("span", { "data-kind": "string" }),
        },
      },
      { renderers: {} },
    );
  } catch (error) {
    return {
      message: (error as Error).message,
    };
  }

  return {
    message: "no-error",
  };
};
