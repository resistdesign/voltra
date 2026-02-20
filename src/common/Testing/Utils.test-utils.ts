import { TestComparisonOperation } from "./Types";
import { compare, mergeTestResults, OPERATIONS } from "./Utils";

export const runTestingUtilsEqualsResultScenario = () =>
  compare(1, 1, TestComparisonOperation.EQUALS);

export const runTestingUtilsNotEqualsResultScenario = () =>
  compare(1, 2, TestComparisonOperation.NOT_EQUALS);

export const runTestingUtilsInResultScenario = () =>
  compare("a", ["a", "b"], TestComparisonOperation.IN);

export const runTestingUtilsBetweenResultScenario = () =>
  compare(5, [1, 10], TestComparisonOperation.BETWEEN);

export const runTestingUtilsContainsResultScenario = () =>
  compare("hello world", "world", TestComparisonOperation.CONTAINS);

export const runTestingUtilsRegexResultScenario = () =>
  compare(
    "alpha-123",
    { pattern: "^alpha-\\d+$" },
    TestComparisonOperation.REGEX,
  );

export const runTestingUtilsExtRegexResultScenario = () =>
  compare(
    "alpha-123",
    {
      pattern: [{ value: "alpha-" }, { value: "\\d+", escaped: false }],
    },
    TestComparisonOperation.EXT_REGEX,
  );

export const runTestingUtilsDeepEqualsResultScenario = () =>
  compare(
    { a: 1, b: { c: 2 } },
    { a: 1, b: { c: 2 } },
    TestComparisonOperation.DEEP_EQUALS,
  );

export const runTestingUtilsArrayContainsResultScenario = () =>
  compare(["x", "y"], "y", TestComparisonOperation.ARRAY_CONTAINS);

export const runTestingUtilsArrayEqualsResultScenario = () =>
  compare([1, 2, 3], [1, 2, 3], TestComparisonOperation.ARRAY_EQUALS);

export const runTestingUtilsMergedScenario = () =>
  mergeTestResults(
    {
      messages: ["m1"],
      passes: ["p1"],
    },
    {
      messages: ["m2"],
      failures: ["f1"],
    },
  );

export const runTestingUtilsOperationKeysScenario = () =>
  Object.keys(OPERATIONS).sort();
