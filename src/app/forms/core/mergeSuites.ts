/**
 * @packageDocumentation
 *
 * Helpers for composing component suites.
 */

import type { ComponentSuite, FieldKind, FieldRenderer } from "./types";

/**
 * Deep-merge component suites, allowing overrides for renderers and primitives.
 *
 * @param base - Base suite to extend.
 * @param overrides - Partial suite overrides.
 * @returns Merged suite.
 */
export const mergeSuites = <RenderOutput = unknown>(
  base: ComponentSuite<RenderOutput>,
  overrides: ComponentSuite<RenderOutput>,
): ComponentSuite<RenderOutput> => {
  return {
    renderers: {
      ...(base.renderers ?? {}),
      ...(overrides.renderers ?? {}),
    },
    primitives: {
      ...(base.primitives ?? {}),
      ...(overrides.primitives ?? {}),
    },
  };
};

/**
 * Convenience helper to override a single renderer.
 *
 * @param kind - Field kind to override.
 * @param renderer - Replacement renderer.
 * @returns Suite with renderer override.
 */
export const withRendererOverride = <RenderOutput = unknown>(
  kind: FieldKind,
  renderer: FieldRenderer<RenderOutput>,
): ComponentSuite<RenderOutput> => ({
  renderers: {
    [kind]: renderer,
  },
});
