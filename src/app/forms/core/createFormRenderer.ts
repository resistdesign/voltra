/**
 * @packageDocumentation
 *
 * Factory for building form renderers backed by component suites.
 */

import type { ResolvedSuite, ComponentSuite } from "./types";
import { resolveSuite } from "./resolveSuite";
import { createAutoField, type AutoFieldInput } from "./createAutoField";

/**
 * Build form renderers backed by resolved component suites.
 *
 * @param options - Suite configuration.
 * @returns Renderer helpers tied to resolved suites.
 */
export const createFormRenderer = <RenderOutput = unknown>(options: {
  fallbackSuite: ComponentSuite<RenderOutput>;
  suite?: ComponentSuite<RenderOutput>;
}) => {
  const resolvedSuite: ResolvedSuite<RenderOutput> = resolveSuite(
    options.suite,
    options.fallbackSuite,
  );
  const AutoField = createAutoField(resolvedSuite);

  return {
    AutoField,
    suite: resolvedSuite,
  };
};

/**
 * Props for AutoField produced by {@link createFormRenderer}.
 */
export type AutoFieldRendererProps = AutoFieldInput;
