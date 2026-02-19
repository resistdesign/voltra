/**
 * @packageDocumentation
 *
 * Test utilities for suite merge helpers.
 */

import type { ComponentSuite } from "./types";
import { mergeSuites, withRendererOverride } from "./mergeSuites";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const baseSuite: ComponentSuite = {
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
 * Validate merging behavior for suites.
 */
export const runMergeSuitesScenario = () => {
  const merged = mergeSuites(baseSuite, {
    renderers: {
      string: () => createElement("span", { "data-kind": "override" }),
    },
    primitives: {
      Button: () => createElement("span", { "data-kind": "override_button" }),
    },
  });

  return {
    stringRenderer: renderToStaticMarkup(createElement(merged.renderers.string as any, {} as any)).includes(
      "override",
    ),
    numberRenderer: renderToStaticMarkup(createElement(merged.renderers.number as any, {} as any)).includes(
      "number",
    ),
    buttonPrimitive: renderToStaticMarkup(createElement(merged.primitives?.Button as any, {} as any)).includes(
      "override_button",
    ),
  };
};

/**
 * Validate single renderer override helper.
 */
export const runWithRendererOverrideScenario = () => {
  const override = withRendererOverride(
    "string",
    () => createElement("span", { "data-kind": "override" }),
  );
  const merged = mergeSuites(baseSuite, override);

  return {
    stringRenderer: renderToStaticMarkup(createElement(merged.renderers.string as any, {} as any)).includes(
      "override",
    ),
    numberRenderer: renderToStaticMarkup(createElement(merged.renderers.number as any, {} as any)).includes(
      "number",
    ),
  };
};
