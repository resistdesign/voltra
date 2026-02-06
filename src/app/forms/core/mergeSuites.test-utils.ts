/**
 * @packageDocumentation
 *
 * Test utilities for suite merge helpers.
 */

import type { ComponentSuite } from "./types";
import { mergeSuites, withRendererOverride } from "./mergeSuites";

const baseSuite: ComponentSuite<string> = {
  renderers: {
    string: () => "string",
    number: () => "number",
    boolean: () => "boolean",
    enum_select: () => "enum",
    array: () => "array",
    relation_single: () => "relation_single",
    relation_array: () => "relation_array",
    custom_single: () => "custom_single",
    custom_array: () => "custom_array",
  },
  primitives: {
    Button: () => "button",
  },
};

/**
 * Validate merging behavior for suites.
 */
export const runMergeSuitesScenario = () => {
  const merged = mergeSuites(baseSuite, {
    renderers: {
      string: () => "override",
    },
    primitives: {
      Button: () => "override_button",
    },
  });

  return {
    stringRenderer: merged.renderers.string?.({} as any),
    numberRenderer: merged.renderers.number?.({} as any),
    buttonPrimitive: merged.primitives?.Button?.({} as any) ?? null,
  };
};

/**
 * Validate single renderer override helper.
 */
export const runWithRendererOverrideScenario = () => {
  const override = withRendererOverride("string", () => "override");
  const merged = mergeSuites(baseSuite, override);

  return {
    stringRenderer: merged.renderers.string?.({} as any),
    numberRenderer: merged.renderers.number?.({} as any),
  };
};
