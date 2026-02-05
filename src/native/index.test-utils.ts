/**
 * @packageDocumentation
 *
 * Test utilities for native entrypoint exports.
 */

import * as Native from "./index";

/**
 * Validate native index exports.
 */
export const runNativeIndexScenario = () => {
  return {
    hasForms: "Forms" in Native,
  };
};
