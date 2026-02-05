/**
 * @packageDocumentation
 *
 * Test utilities for createFormRenderer.
 */

import type { ComponentSuite } from "./types";
import { createFormRenderer } from "./createFormRenderer";

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
};

/**
 * Validate that form renderer uses fallback suite when no overrides provided.
 */
export const runCreateFormRendererFallbackScenario = () => {
  const renderer = createFormRenderer({ fallbackSuite });

  return {
    stringKind: renderer.AutoField({
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
        string: () => "override",
      },
    },
  });

  return {
    stringKind: renderer.AutoField({
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
  };
};
