/**
 * @packageDocumentation
 *
 * Convenience factory for native form renderers.
 */

import type { ReactElement } from "react";
import type { ComponentSuite } from "../../app/forms/core/types";
import { createFormRenderer } from "../../app/forms/core/createFormRenderer";
import { nativeSuite } from "./suite";

/**
 * Create a native form renderer using the default native suite.
 *
 * @category Forms
 *
 * @param options - Optional suite overrides.
 * @returns Native form renderers.
 */
export const createNativeFormRenderer = (options?: {
  suite?: ComponentSuite<ReactElement>;
}) => {
  return createFormRenderer({
    fallbackSuite: nativeSuite,
    suite: options?.suite,
  });
};
