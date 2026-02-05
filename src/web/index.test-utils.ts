/**
 * @packageDocumentation
 *
 * Test utilities for web entrypoint exports.
 */

import * as Web from "./index";

/**
 * Validate web index exports.
 */
export const runWebIndexScenario = () => {
  return {
    hasForms: "Forms" in Web,
    hasUtils: "Utils" in Web,
  };
};
