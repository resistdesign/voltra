/**
 * Operations used for comparison during tests.
 */
export enum TestComparisonOperation {
  /**
   * Strict equality comparison.
   * */
  EQUALS = "===",
  /**
   * Strict inequality comparison.
   * */
  NOT_EQUALS = "!==",
  /**
   * Value is contained in expectation array.
   * */
  IN = "IN",
  /**
   * Array contains the expectation value.
   * */
  ARRAY_CONTAINS = "ARRAY_CONTAINS",
  /**
   * Numeric value is between two bounds.
   * */
  BETWEEN = "BETWEEN",
  /**
   * String contains another string.
   * */
  CONTAINS = "CONTAINS",
  /**
   * Regex match against a pattern.
   * */
  REGEX = "REGEX",
  /**
   * Extended regex match with explicit pattern elements.
   * */
  EXT_REGEX = "EXT_REGEX",
  /**
   * Deep equality using JSON stringification.
   * */
  DEEP_EQUALS = "DEEP_EQUALS",
  /**
   * Array equality using JSON stringification.
   * */
  ARRAY_EQUALS = "ARRAY_EQUALS",
}

/**
 * A pattern definition object for use with extended regex expectations.
 * */
export type PatternElement = {
  /**
   * Literal pattern segment value.
   * */
  value: string;
  /**
   * Whether to escape regex characters in the value.
   * */
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
  /**
   * Pattern elements to build the regex.
   * */
  pattern: PatternElement[];
  /**
   * Regex flags to apply.
   * */
  flags?: string;
};

/**
 * A regex expectation with a pattern and optional flags.
 *
 * Used when a `TestCondition` `operation` is `TestComparisonOperation.REGEX`.
 * */
export type RegexExpectation = {
  /**
   * Regex pattern string.
   * */
  pattern: string;
  /**
   * Regex flags to apply.
   * */
  flags?: string;
};

/**
 * A configuration used to acquire conditions from code instead of a JSON array.
 * */
export type ConditionConfig = {
  /**
   * Relative file path containing the conditions export.
   * */
  file: string;
  /**
   * Export name that contains the conditions array.
   * */
  export: string;
};

/**
 * Preparation for a test when some setup is required or a class needs to be instantiated.
 * */
export type TestSetup = {
  /**
   * Conditions to use for the setup function or constructor.
   * */
  conditions: unknown[] | ConditionConfig;
  /**
   * Export name to call or instantiate for setup.
   * */
  export: string;
  /**
   * Whether to use `new` with the setup export.
   * */
  instantiate?: boolean;
};

/**
 * The basis for a test.
 * */
export type BaseTest = {
  /**
   * Export name for the test function.
   * */
  export: string;
  /**
   * Optional setup configuration.
   * */
  setup?: TestSetup;
  /**
   * Conditions to pass to the test function.
   * */
  conditions: unknown[] | ConditionConfig;
  /**
   * Allow missing expectation and treat undefined as pass.
   * */
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
 * A configuration for a test. Designed to be used in JSON spec files.
 */
export type TestConfig = {
  /**
   * Relative module path containing test exports.
   * */
  file: string;
  /**
   * Tests to execute for the module.
   * */
  tests: Test[];
};

/**
 * A resolved test configuration with the module and tests.
 * */
export type ResolvedTestConfig = {
  /**
   * Required module with test exports.
   * */
  targetModule: any;
} & TestConfig;

/**
 * The results from running one or more tests.
 * */
export type TestResults = {
  /**
   * Informational messages.
   * */
  messages?: string[];
  /**
   * Generated expectation messages.
   * */
  generated?: string[];
  /**
   * Passed test messages.
   * */
  passes?: string[];
  /**
   * Failed test messages.
   * */
  failures?: string[];
  /**
   * Error messages.
   * */
  errors?: string[];
};
