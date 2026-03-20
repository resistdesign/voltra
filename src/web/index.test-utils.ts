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
    hasNavLinkTopLevel: "NavLink" in Web,
  };
};

export const runWebIndexHasFormsScenario = async () =>
  (await runWebIndexScenario()).hasForms;

export const runWebIndexHasUtilsScenario = async () =>
  (await runWebIndexScenario()).hasUtils;

export const runWebIndexHasNavLinkTopLevelScenario = async () =>
  (await runWebIndexScenario()).hasNavLinkTopLevel;
