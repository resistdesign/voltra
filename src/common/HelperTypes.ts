export type ExpandComplexType<T> = {
  [K in keyof T]: T[K];
} & {};
