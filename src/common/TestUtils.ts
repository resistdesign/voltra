#!/usr/bin/env ts-node

import { promises as FS } from "fs";
import Path from "path";
import fastGlob from "fast-glob";

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
 * The basis for a test condition.
 * */
export type BaseTestCondition = {
  conditions: unknown[];
  expectUndefined?: boolean;
};

/**
 * A singular test condition with specific types of expectations for a given operation.
 * */
export type TestCondition = BaseTestCondition &
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
 * Preparation for a test when some setup is required or a class needs to be instantiated.
 * */
export type TestSetup = {
  conditions: unknown[];
  export: string;
  instantiate?: boolean;
};

/**
 * A configuration for a test. Designed to be used in JSON for declarative test files.
 * */
export type TestConfig = {
  subject: {
    file: string;
    export: string;
  };
  setup?: TestSetup;
  tests: TestCondition[];
};

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
 * A map of comparison functions for each `TestComparisonOperation`.
 * */
export const OPERATIONS: Record<string, (a: unknown, b: unknown) => boolean> = {
  [TestComparisonOperation.EQUALS]: (a, b) => a === b,
  [TestComparisonOperation.NOT_EQUALS]: (a, b) => a !== b,
  [TestComparisonOperation.IN]: (a, b) => Array.isArray(b) && b.includes(a),
  [TestComparisonOperation.BETWEEN]: (a, b) => {
    if (
      Array.isArray(b) &&
      b.length === 2 &&
      typeof b[0] === "number" &&
      typeof b[1] === "number"
    ) {
      return typeof a === "number" && a >= b[0] && a <= b[1];
    }
    throw new Error("BETWEEN requires an array of two numbers as expectation.");
  },
  [TestComparisonOperation.CONTAINS]: (a, b) =>
    typeof a === "string" && typeof b === "string" && a.includes(b),
  [TestComparisonOperation.REGEX]: (a, b) => {
    if (typeof b === "object" && b !== null && "pattern" in b) {
      const { pattern, flags } = b as RegexExpectation;
      try {
        const regex = new RegExp(pattern, flags);
        return typeof a === "string" && regex.test(a);
      } catch (err: any) {
        throw new Error(`Invalid REGEX: ${err.message}`);
      }
    }
    throw new Error(
      "REGEX requires an expectation with 'pattern' and optional 'flags'.",
    );
  },
  [TestComparisonOperation.EXT_REGEX]: (a, b) => {
    if (typeof b === "object" && b !== null && "pattern" in b) {
      const { pattern, flags } = b as EXTRegexExpectation;
      const buildRegexFromPattern = (
        pattern: PatternElement[],
        flags = "",
      ): RegExp => {
        if (!Array.isArray(pattern)) {
          throw new Error("EXT_REGEX pattern must be an array of objects.");
        }

        const regexBody = pattern
          .map(({ value, escaped }) => {
            if (typeof value !== "string") {
              throw new Error(
                "Each pattern element must have a string 'value'.",
              );
            }
            return escaped
              ? value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
              : value;
          })
          .join("");

        return new RegExp(regexBody, flags);
      };

      try {
        const regex = buildRegexFromPattern(pattern, flags);
        return typeof a === "string" && regex.test(a);
      } catch (err: any) {
        throw new Error(`Invalid EXT_REGEX: ${err.message}`);
      }
    }
    throw new Error(
      "EXT_REGEX requires an expectation with 'pattern' as an array of PatternElement and optional 'flags'.",
    );
  },
  [TestComparisonOperation.DEEP_EQUALS]: (a, b) => {
    if (
      typeof a === "object" &&
      typeof b === "object" &&
      a !== null &&
      b !== null
    ) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  },
  [TestComparisonOperation.ARRAY_CONTAINS]: (a, b) => {
    if (Array.isArray(a)) {
      return a.includes(b);
    }
    throw new Error("ARRAY_CONTAINS requires an array as the first argument.");
  },
  [TestComparisonOperation.ARRAY_EQUALS]: (a, b) => {
    if (Array.isArray(a) && Array.isArray(b)) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    throw new Error("ARRAY_EQUALS requires two arrays as arguments.");
  },
};

/**
 * Compare a result with an expectation using a specified `TestComparisonOperation`.
 * */
export const compare = (
  result: unknown,
  expectation: unknown,
  operation: TestComparisonOperation = TestComparisonOperation.EQUALS,
): boolean => {
  const op = OPERATIONS[operation];
  if (!op) {
    throw new Error(`Unsupported operation: ${operation}`);
  }
  return op(result, expectation);
};

/**
 * Get the target base instance from a module, for a given test setup.
 * */
export const getSetupInstance = async (
  module: any,
  setup: TestSetup | undefined,
): Promise<any> => {
  if (!setup) return module;

  const setupFunction = module[setup.export];

  if (typeof setupFunction !== "function") {
    throw new Error(`Setup export "${setup.export}" is not a function.`);
  }

  return setup.instantiate
    ? new setupFunction(...setup.conditions)
    : await setupFunction(...setup.conditions);
};

/**
 * Run a test using a test function and a test condition.
 * */
export const runTest = async (
  testFunction: (...args: unknown[]) => Promise<unknown> | unknown,
  test: TestCondition,
  index: number,
): Promise<void> => {
  const { conditions, expectation, operation, expectUndefined } = test;
  try {
    const result = await testFunction(...conditions);
    const passed = expectUndefined || compare(result, expectation, operation);
    if (passed) {
      console.log(
        `  Test ${index + 1}: PASSED - Conditions: ${JSON.stringify(conditions)}`,
      );
    } else {
      console.error(
        `  Test ${index + 1}: FAILED - Conditions: ${JSON.stringify(conditions)}, Expectation: ${JSON.stringify(expectation)}, Result: ${JSON.stringify(result)}`,
      );
    }
  } catch (err: any) {
    console.error(
      `  Test ${index + 1}: ERROR - Conditions: ${JSON.stringify(conditions)}, Error: ${err.message}`,
    );
  }
};

/**
 * Generate tests for a file by running the tests, capturing the current result and storing it as the new expectation.
 * */
export const generateTestsForFile = async (
  testFilePath: string,
): Promise<void> => {
  try {
    const testConfig: TestConfig = JSON.parse(
      await FS.readFile(testFilePath, "utf8"),
    );
    const { subject, setup, tests } = testConfig;

    if (!subject || !subject.file || !subject.export) {
      throw new Error(`Invalid subject configuration in ${testFilePath}`);
    }

    const modulePath = Path.resolve(Path.dirname(testFilePath), subject.file);
    const module = require(modulePath);
    const instance = await getSetupInstance(module, setup);
    const testFunction = instance[subject.export];

    if (typeof testFunction !== "function") {
      throw new Error(
        `Export "${subject.export}" from "${subject.file}" is not a function.`,
      );
    }

    console.log(`Generating tests for ${testFilePath}`);

    const generatedTests = [];
    let hasNewExpectations = false;

    for (const test of tests) {
      const { conditions, expectation, operation, expectUndefined } = test;

      if (expectation !== undefined || expectUndefined) {
        generatedTests.push(test); // Skip if expectation already exists
        continue;
      }

      const result = await testFunction(...conditions);
      console.log(
        `  Captured expectation for conditions ${JSON.stringify(
          conditions,
        )}: ${JSON.stringify(result)}`,
      );

      generatedTests.push({
        ...test,
        expectation: result,
        operation: operation || TestComparisonOperation.EQUALS,
      });
      hasNewExpectations = true;
    }

    if (hasNewExpectations) {
      const updatedTestConfig = { ...testConfig, tests: generatedTests };
      await FS.writeFile(
        testFilePath,
        JSON.stringify(updatedTestConfig, null, 2),
      );
      console.log(`Updated test file saved to ${testFilePath}`);
    } else {
      console.log(`No new expectations were generated for ${testFilePath}`);
    }
  } catch (err: any) {
    console.error(`Error processing test file ${testFilePath}: ${err.message}`);
  }
};

/**
 * Run the tests for a given test file.
 *
 * The test file content is expected to be a JSON in the structure of a `TestConfig`.
 * */
export const runTestsForFile = async (testFilePath: string): Promise<void> => {
  try {
    const testConfig: TestConfig = JSON.parse(
      await FS.readFile(testFilePath, "utf8"),
    );
    const { subject, setup, tests } = testConfig;

    if (!subject || !subject.file || !subject.export) {
      throw new Error(`Invalid subject configuration in ${testFilePath}`);
    }

    const modulePath = Path.resolve(Path.dirname(testFilePath), subject.file);
    const module = require(modulePath);
    const instance = await getSetupInstance(module, setup);
    const testFunction = instance[subject.export];

    if (typeof testFunction !== "function") {
      throw new Error(
        `Export "${subject.export}" from "${subject.file}" is not a function.`,
      );
    }

    console.log(`Running tests from ${testFilePath}`);
    for (const [index, test] of tests.entries()) {
      await runTest(testFunction, test, index);
    }
  } catch (err: any) {
    console.error(`Error processing test file ${testFilePath}: ${err.message}`);
  }
};

/**
 * Run or generate all of the tests in the specified `testPath` glob.
 * */
export const runTests = async (
  testPath: string,
  generateMode = false,
): Promise<void> => {
  try {
    const testFiles = await fastGlob(testPath);

    if (testFiles.length === 0) {
      console.warn(`No test files found in ${testPath}`);
      return;
    }

    for (const testFile of testFiles) {
      if (generateMode) {
        await generateTestsForFile(Path.resolve(testFile));
      } else {
        await runTestsForFile(Path.resolve(testFile));
      }
    }

    console.log("Testing complete.");
  } catch (err: any) {
    console.error(`Error running tests: ${err.message}`);
  }
};

// CLI entry point.
if (require.main === module) {
  const args = process.argv.slice(2);
  const generateMode = args.includes("--generate");
  const testPath = args.filter((arg) => arg !== "--generate")[0];

  if (!testPath) {
    console.error("Usage: vest [--generate] <test-directory-path>");
    process.exit(1);
  }

  runTests(testPath, generateMode);
}
