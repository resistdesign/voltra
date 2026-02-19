/**
 * @packageDocumentation
 *
 * Test utilities for native utils barrel exports.
 */

import * as NativeUtils from "./index";

/**
 * Validate native utils barrel export surface.
 */
export const runNativeUtilsIndexScenario = () => {
  return {
    hasEasyLayoutFactory: "makeNativeEasyLayout" in NativeUtils,
    hasEasyLayoutHook: "useNativeEasyLayout" in NativeUtils,
    hasEasyLayoutView: "NativeEasyLayoutView" in NativeUtils,
    hasCreateNativeHistory: "createNativeHistory" in NativeUtils,
    hasMapNativeURLToPath: "mapNativeURLToPath" in NativeUtils,
    hasRoute: "Route" in NativeUtils,
    hasBuildPathFromRouteChain: "buildPathFromRouteChain" in NativeUtils,
    hasNativeBackIntegration: "createNativeRouteBackIntegration" in NativeUtils,
  };
};

