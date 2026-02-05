/**
 * @packageDocumentation
 *
 * Test utilities for app/forms barrel exports.
 */

import * as Forms from "./index";

/**
 * Validate forms index exports.
 */
export const runAppFormsIndexScenario = () => {
  return {
    hasCreateFormRenderer: "createFormRenderer" in Forms,
    hasCreateWebFormRenderer: "createWebFormRenderer" in Forms,
    hasCreateNativeFormRenderer: "createNativeFormRenderer" in Forms,
    hasMergeSuites: "mergeSuites" in Forms,
  };
};
