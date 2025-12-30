/**
 * Expand inferred types for clearer IntelliSense/display.
 *
 * @typeParam T - Type to expand.
 */
export type ExpandComplexType<T> = {
  [K in keyof T]: T[K];
} & {};

export const HelperTypes = {};
