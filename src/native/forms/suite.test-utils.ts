/**
 * @packageDocumentation
 *
 * Test utilities for the default native form suite.
 */

import type { FieldKind } from "../../app/forms/core";
import { nativeSuite } from "./suite";

const fieldKinds: FieldKind[] = [
  "string",
  "number",
  "boolean",
  "enum_select",
  "array",
  "relation_single",
  "relation_array",
  "custom_single",
  "custom_array",
];

/**
 * Ensure the native suite provides a renderer for every field kind.
 */
export const runNativeSuiteCompletenessScenario = () => {
  const missingKinds = fieldKinds.filter(
    (kind) => !nativeSuite.renderers[kind],
  );

  return {
    missingKinds,
  };
};
