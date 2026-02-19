/**
 * @packageDocumentation
 *
 * Test utilities for app/forms barrel exports.
 */

import * as Forms from "./index";

export const runAppFormsIndexHasCreateFormRendererScenario = () =>
  "createFormRenderer" in Forms;

export const runAppFormsIndexHasCreateWebFormRendererScenario = () =>
  "createWebFormRenderer" in Forms;

export const runAppFormsIndexHasCreateNativeFormRendererScenario = () =>
  "createNativeFormRenderer" in Forms;

export const runAppFormsIndexHasMergeSuitesScenario = () =>
  "mergeSuites" in Forms;
