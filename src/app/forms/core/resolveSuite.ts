/**
 * @packageDocumentation
 *
 * Resolve a component suite by merging overrides with fallback defaults.
 */

import type { ComponentSuite, FieldKind, ResolvedSuite } from "./types";

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

const getMissingKinds = <RenderOutput = unknown>(
  renderers: Partial<ResolvedSuite<RenderOutput>["renderers"]>,
): FieldKind[] => {
  return fieldKinds.filter((kind) => !renderers[kind]);
};

/**
 * Merge a fallback suite with overrides and ensure completeness.
 *
 * @param overrides - Partial suite to apply on top of fallback.
 * @param fallback - Default suite providing full coverage.
 * @returns Fully resolved suite with all renderers present.
 */
export const resolveSuite = <RenderOutput = unknown>(
  overrides: ComponentSuite<RenderOutput> | undefined,
  fallback: ComponentSuite<RenderOutput>,
): ResolvedSuite<RenderOutput> => {
  const mergedRenderers = {
    ...(fallback.renderers ?? {}),
    ...(overrides?.renderers ?? {}),
  } as ResolvedSuite<RenderOutput>["renderers"];

  const missingKinds = getMissingKinds(mergedRenderers);
  if (missingKinds.length) {
    throw new Error(
      `Missing renderers for field kinds: ${missingKinds.join(", ")}`,
    );
  }

  const mergedPrimitives = {
    ...(fallback.primitives ?? {}),
    ...(overrides?.primitives ?? {}),
  };

  return {
    renderers: mergedRenderers,
    primitives: Object.keys(mergedPrimitives).length
      ? mergedPrimitives
      : undefined,
  };
};
