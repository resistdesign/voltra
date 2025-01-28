/**
 * Operations used for comparison of during tests.
 * */
export enum TestComparisonOperation {
  EQUALS = "===",
  NOT_EQUALS = "!==",
  IN = "IN",
  ARRAY_CONTAINS = "ARRAY_CONTAINS",
  BETWEEN = "BETWEEN",
  CONTAINS = "CONTAINS",
  REGEX = "REGEX",
  EXT_REGEX = "EXT_REGEX",
  DEEP_EQUALS = "DEEP_EQUALS",
  ARRAY_EQUALS = "ARRAY_EQUALS",
}

/**
 * A pattern definition object for use with extended regex expectations.
 * */
export type PatternElement = {
  value: string;
  escaped?: boolean;
};

/**
 * An extended regex expectation with a patter structure, optional flags and
 * escaping properties that allow for clear and explicit declaration of regex
 * patterns in JSON.
 *
 * Used when a `TestCondition` `operation` is `TestComparisonOperation.EXT_REGEX`.
 * */
export type EXTRegexExpectation = {
  pattern: PatternElement[];
  flags?: string;
};

/**
 * A regex expectation with a pattern and optional flags.
 *
 * Used when a `TestCondition` `operation` is `TestComparisonOperation.REGEX`.
 * */
export type RegexExpectation = {
  pattern: string;
  flags?: string;
};

/**
 * Preparation for a test when some setup is required or a class needs to be instantiated.
 * */
export type TestSetup = {
  conditions: unknown[];
  export: string;
  instantiate?: boolean;
};

/**
 * The basis for a test.
 * */
export type BaseTest = {
  export: string;
  setup?: TestSetup;
  conditions: unknown[];
  expectUndefined?: boolean;
};

/**
 * A singular test with specific types of expectations for a given operation.
 * */
export type Test = BaseTest &
  (
    | {
        operation?:
          | TestComparisonOperation.EQUALS
          | TestComparisonOperation.NOT_EQUALS;
        expectation: string | number | boolean | null | undefined;
      }
    | {
        operation:
          | TestComparisonOperation.IN
          | TestComparisonOperation.ARRAY_CONTAINS;
        expectation: unknown[];
      }
    | {
        operation: TestComparisonOperation.BETWEEN;
        expectation: [number, number];
      }
    | {
        operation: TestComparisonOperation.CONTAINS;
        expectation: string;
      }
    | {
        operation: TestComparisonOperation.REGEX;
        expectation: RegexExpectation;
      }
    | {
        operation: TestComparisonOperation.EXT_REGEX;
        expectation: EXTRegexExpectation;
      }
    | {
        operation: TestComparisonOperation.DEEP_EQUALS;
        expectation: Record<string, unknown>;
      }
    | {
        operation: TestComparisonOperation.ARRAY_EQUALS;
        expectation: unknown[];
      }
  );

/**
 * A configuration for a test. Designed to be used in JSON for declarative test files.
 * */
export type TestConfig = {
  file: string;
  tests: Test[];
};

/**
 * A resolved test configuration with the module and tests.
 * */
export type ResolvedTestConfig = {
  targetModule: any;
} & TestConfig;
