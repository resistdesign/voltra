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
    hasNavButton: "NavButton" in NativeUtils,
    hasRoute: "Route" in NativeUtils,
    hasNativeBackIntegration: "createNativeRouteBackIntegration" in NativeUtils,
  };
};

export const runNativeUtilsIndexHasEasyLayoutFactoryScenario = async () =>
  (await runNativeUtilsIndexScenario()).hasEasyLayoutFactory;

export const runNativeUtilsIndexHasEasyLayoutHookScenario = async () =>
  (await runNativeUtilsIndexScenario()).hasEasyLayoutHook;

export const runNativeUtilsIndexHasEasyLayoutViewScenario = async () =>
  (await runNativeUtilsIndexScenario()).hasEasyLayoutView;

export const runNativeUtilsIndexHasCreateNativeHistoryScenario = async () =>
  (await runNativeUtilsIndexScenario()).hasCreateNativeHistory;

export const runNativeUtilsIndexHasMapNativeURLToPathScenario = async () =>
  (await runNativeUtilsIndexScenario()).hasMapNativeURLToPath;

export const runNativeUtilsIndexHasNavButtonScenario = async () =>
  (await runNativeUtilsIndexScenario()).hasNavButton;

export const runNativeUtilsIndexHasRouteScenario = async () =>
  (await runNativeUtilsIndexScenario()).hasRoute;

export const runNativeUtilsIndexHasNativeBackIntegrationScenario = async () =>
  (await runNativeUtilsIndexScenario()).hasNativeBackIntegration;
