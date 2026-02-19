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

export const runNativeFormsIndexHasAutoFieldScenario = async () =>
  (await runNativeFormsIndexScenario()).hasAutoField;

export const runNativeFormsIndexHasAutoFormScenario = async () =>
  (await runNativeFormsIndexScenario()).hasAutoForm;

export const runNativeFormsIndexHasAutoFormViewScenario = async () =>
  (await runNativeFormsIndexScenario()).hasAutoFormView;

export const runNativeFormsIndexHasCreateNativeFormRendererScenario = async () =>
  (await runNativeFormsIndexScenario()).hasCreateNativeFormRenderer;

export const runNativeFormsIndexHasNativeSuiteScenario = async () =>
  (await runNativeFormsIndexScenario()).hasNativeSuite;

export const runNativeFormsIndexHasNativeAutoFieldScenario = async () =>
  (await runNativeFormsIndexScenario()).hasNativeAutoField;

export const runNativeFormsIndexHasFieldWrapperScenario = async () =>
  (await runNativeFormsIndexScenario()).hasFieldWrapper;

export const runNativeFormsIndexHasErrorMessageScenario = async () =>
  (await runNativeFormsIndexScenario()).hasErrorMessage;

export const runNativeFormsIndexHasArrayContainerScenario = async () =>
  (await runNativeFormsIndexScenario()).hasArrayContainer;

export const runNativeFormsIndexHasArrayItemWrapperScenario = async () =>
  (await runNativeFormsIndexScenario()).hasArrayItemWrapper;

export const runNativeFormsIndexHasButtonPrimitiveScenario = async () =>
  (await runNativeFormsIndexScenario()).hasButtonPrimitive;
