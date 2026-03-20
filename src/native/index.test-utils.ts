/**
 * @packageDocumentation
 *
 * Test utilities for native entrypoint exports.
 */

import * as Native from "./index";
import * as NativeForms from "./forms";
import * as NativeUtils from "./utils";

/**
 * Validate native index exports and flattening behavior.
 */
export const runNativeIndexScenario = () => {
  return {
    hasFormsNamespace: "Forms" in Native,
    hasUtilsNamespace: "Utils" in Native,
    hasAutoFormTopLevel: "AutoForm" in Native,
    hasAutoFormViewTopLevel: "AutoFormView" in Native,
    hasCreateNativeFormRendererTopLevel: "createNativeFormRenderer" in Native,
    hasNativeSuiteTopLevel: "nativeSuite" in Native,
    hasCreateNativeHistoryTopLevel: "createNativeHistory" in Native,
    hasNavButtonTopLevel: "NavButton" in Native,
    hasRouteTopLevel: "Route" in Native,
    hasMakeNativeEasyLayoutTopLevel: "makeNativeEasyLayout" in Native,
    hasFormsAutoForm: "AutoForm" in NativeForms,
    hasFormsCreateNativeFormRenderer: "createNativeFormRenderer" in NativeForms,
    hasUtilsCreateNativeHistory: "createNativeHistory" in NativeUtils,
    hasUtilsNavButton: "NavButton" in NativeUtils,
    hasUtilsRoute: "Route" in NativeUtils,
  };
};

export const runNativeIndexHasFormsNamespaceScenario = async () =>
  (await runNativeIndexScenario()).hasFormsNamespace;

export const runNativeIndexHasUtilsNamespaceScenario = async () =>
  (await runNativeIndexScenario()).hasUtilsNamespace;

export const runNativeIndexHasAutoFormTopLevelScenario = async () =>
  (await runNativeIndexScenario()).hasAutoFormTopLevel;

export const runNativeIndexHasAutoFormViewTopLevelScenario = async () =>
  (await runNativeIndexScenario()).hasAutoFormViewTopLevel;

export const runNativeIndexHasCreateNativeFormRendererTopLevelScenario = async () =>
  (await runNativeIndexScenario()).hasCreateNativeFormRendererTopLevel;

export const runNativeIndexHasNativeSuiteTopLevelScenario = async () =>
  (await runNativeIndexScenario()).hasNativeSuiteTopLevel;

export const runNativeIndexHasCreateNativeHistoryTopLevelScenario = async () =>
  (await runNativeIndexScenario()).hasCreateNativeHistoryTopLevel;

export const runNativeIndexHasNavButtonTopLevelScenario = async () =>
  (await runNativeIndexScenario()).hasNavButtonTopLevel;

export const runNativeIndexHasRouteTopLevelScenario = async () =>
  (await runNativeIndexScenario()).hasRouteTopLevel;

export const runNativeIndexHasMakeNativeEasyLayoutTopLevelScenario = async () =>
  (await runNativeIndexScenario()).hasMakeNativeEasyLayoutTopLevel;

export const runNativeIndexHasFormsAutoFormScenario = async () =>
  (await runNativeIndexScenario()).hasFormsAutoForm;

export const runNativeIndexHasFormsCreateNativeFormRendererScenario = async () =>
  (await runNativeIndexScenario()).hasFormsCreateNativeFormRenderer;

export const runNativeIndexHasUtilsCreateNativeHistoryScenario = async () =>
  (await runNativeIndexScenario()).hasUtilsCreateNativeHistory;

export const runNativeIndexHasUtilsNavButtonScenario = async () =>
  (await runNativeIndexScenario()).hasUtilsNavButton;

export const runNativeIndexHasUtilsRouteScenario = async () =>
  (await runNativeIndexScenario()).hasUtilsRoute;
