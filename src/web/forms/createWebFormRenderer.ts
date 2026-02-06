/**
 * @packageDocumentation
 *
 * Convenience factory for web form renderers.
 */

import type { ReactElement } from "react";
import type { ComponentSuite } from "../../app/forms/core/types";
import { createFormRenderer } from "../../app/forms/core/createFormRenderer";
import { webSuite } from "./suite";

/**
 * Create a web form renderer using the default web suite.
 *
 * @param options - Optional suite overrides.
 * @returns Web form renderers.
 */
export const createWebFormRenderer = (options?: {
  suite?: ComponentSuite<ReactElement>;
}) => {
  return createFormRenderer({
    fallbackSuite: webSuite,
    suite: options?.suite,
  });
};
