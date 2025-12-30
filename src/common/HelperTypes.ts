/**
 * Expand inferred types for clearer IntelliSense/display.
 */
export type ExpandComplexType<T> = {
  [K in keyof T]: T[K];
} & {};
