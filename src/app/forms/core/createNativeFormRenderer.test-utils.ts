/**
 * @packageDocumentation
 *
 * Test utilities for createNativeFormRenderer.
 */

import { createNativeFormRenderer } from "./createNativeFormRenderer";
import { withRendererOverride } from "./mergeSuites";

/**
 * Validate that native renderer honors overrides.
 */
export const runCreateNativeFormRendererOverrideScenario = () => {
  const renderer = createNativeFormRenderer({
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
