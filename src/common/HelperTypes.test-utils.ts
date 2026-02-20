import type { ExpandComplexType } from "./HelperTypes";

const getHelperTypesScenarioData = () => {
  type Input = { a: string } & { b: number };
  type Expanded = ExpandComplexType<Input>;

  const example: Expanded = { a: "alpha", b: 42 };
  const keys = Object.keys(example).sort();

  return {
    example,
    keys,
  };
};

export const runHelperTypesExampleScenario = () =>
  getHelperTypesScenarioData().example;

export const runHelperTypesKeysScenario = () => getHelperTypesScenarioData().keys;
