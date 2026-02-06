/**
 * @packageDocumentation
 *
 * Test utilities for createWebFormRenderer.
 */

import { withRendererOverride } from "../../app/forms/core/mergeSuites";
import { createWebFormRenderer } from "./createWebFormRenderer";

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
