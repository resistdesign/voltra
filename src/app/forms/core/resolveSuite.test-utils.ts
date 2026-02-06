/**
 * @packageDocumentation
 *
 * Test utilities for resolveSuite.
 */

import type { ComponentSuite } from "./types";
import { resolveSuite } from "./resolveSuite";

const fallbackSuite: ComponentSuite<string> = {
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
 * Override a single renderer and ensure fallback coverage remains.
 */
export const runResolveSuiteOverrideScenario = () => {
  const suite = resolveSuite(
    {
      renderers: {
        string: () => "override_string",
      },
    },
    fallbackSuite,
  );

  return {
    stringRenderer: suite.renderers.string({} as any),
    numberRenderer: suite.renderers.number({} as any),
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
        Button: () => "override_button",
      },
    },
    fallbackSuite,
  );

  return {
    buttonPrimitive: suite.primitives?.Button?.({} as any) ?? null,
    stringRenderer: suite.renderers.string({} as any),
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
          string: () => "string",
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
