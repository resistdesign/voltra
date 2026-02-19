/**
 * @packageDocumentation
 *
 * Test utilities for native forms barrel exports.
 */

import * as NativeForms from "./index";

/**
 * Validate native forms barrel export surface.
 */
export const runNativeFormsIndexScenario = () => {
  return {
    hasAutoField: "AutoField" in NativeForms,
    hasAutoForm: "AutoForm" in NativeForms,
    hasAutoFormView: "AutoFormView" in NativeForms,
    hasCreateNativeFormRenderer: "createNativeFormRenderer" in NativeForms,
    hasNativeSuite: "nativeSuite" in NativeForms,
    hasNativeAutoField: "nativeAutoField" in NativeForms,
    hasFieldWrapper: "FieldWrapper" in NativeForms,
    hasErrorMessage: "ErrorMessage" in NativeForms,
    hasArrayContainer: "ArrayContainer" in NativeForms,
    hasArrayItemWrapper: "ArrayItemWrapper" in NativeForms,
    hasButtonPrimitive: "Button" in NativeForms,
  };
};

