/**
 * @packageDocumentation
 *
 * Test utilities for createWebFormRenderer.
 */

import { createWebFormRenderer } from "./createWebFormRenderer";
import { withRendererOverride } from "./mergeSuites";

/**
 * Validate that web renderer honors overrides.
 */
export const runCreateWebFormRendererOverrideScenario = () => {
  const renderer = createWebFormRenderer({
    suite: withRendererOverride("string", () => "override" as any),
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
