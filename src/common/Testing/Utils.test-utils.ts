import { TestComparisonOperation } from "./Types";
import {
  compare,
  mergeTestResults,
  OPERATIONS,
} from "./Utils";

export const runTestingUtilsScenario = () => {
  const equalsResult = compare(1, 1, TestComparisonOperation.EQUALS);
  const notEqualsResult = compare(1, 2, TestComparisonOperation.NOT_EQUALS);
  const inResult = compare("a", ["a", "b"], TestComparisonOperation.IN);
  const betweenResult = compare(5, [1, 10], TestComparisonOperation.BETWEEN);
  const containsResult = compare(
    "hello world",
    "world",
    TestComparisonOperation.CONTAINS,
  );
  const regexResult = compare(
    "alpha-123",
    { pattern: "^alpha-\\d+$" },
    TestComparisonOperation.REGEX,
  );
  const extRegexResult = compare(
    "alpha-123",
    {
      pattern: [
        { value: "alpha-" },
        { value: "\\d+", escaped: false },
      ],
    },
    TestComparisonOperation.EXT_REGEX,
  );
  const deepEqualsResult = compare(
    { a: 1, b: { c: 2 } },
    { a: 1, b: { c: 2 } },
    TestComparisonOperation.DEEP_EQUALS,
  );
  const arrayContainsResult = compare(
    ["x", "y"],
    "y",
    TestComparisonOperation.ARRAY_CONTAINS,
  );
  const arrayEqualsResult = compare(
    [1, 2, 3],
    [1, 2, 3],
    TestComparisonOperation.ARRAY_EQUALS,
  );

  const merged = mergeTestResults(
    {
      messages: ["m1"],
      passes: ["p1"],
    },
    {
      messages: ["m2"],
      failures: ["f1"],
    },
  );

  return {
    equalsResult,
    notEqualsResult,
    inResult,
    betweenResult,
    containsResult,
    regexResult,
    extRegexResult,
    deepEqualsResult,
    arrayContainsResult,
    arrayEqualsResult,
    merged,
    operationKeys: Object.keys(OPERATIONS).sort(),
  };
};
