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
    hasRouteTopLevel: "Route" in Native,
    hasMakeNativeEasyLayoutTopLevel: "makeNativeEasyLayout" in Native,
    hasFormsAutoForm: "AutoForm" in NativeForms,
    hasFormsCreateNativeFormRenderer: "createNativeFormRenderer" in NativeForms,
    hasUtilsCreateNativeHistory: "createNativeHistory" in NativeUtils,
    hasUtilsRoute: "Route" in NativeUtils,
  };
};

