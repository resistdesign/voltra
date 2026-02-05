/**
 * @packageDocumentation
 *
 * Convenience factory for native form renderers.
 */

import type { ReactElement } from "react";
import type { ComponentSuite } from "./types";
import { createFormRenderer } from "./createFormRenderer";
import { nativeSuite } from "../../../native/forms/suite";

/**
 * Create a native form renderer using the default native suite.
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
