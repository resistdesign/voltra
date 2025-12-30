import type { ExpandComplexType } from "./HelperTypes";

export const runHelperTypesScenario = () => {
  type Input = { a: string } & { b: number };
  type Expanded = ExpandComplexType<Input>;

  const example: Expanded = { a: "alpha", b: 42 };
  const keys = Object.keys(example).sort();

  return {
    example,
    keys,
  };
};
