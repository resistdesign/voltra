#!/usr/bin/env ts-node

import { promises as FS } from "fs";
import Path from "path";
import fastGlob from "fast-glob";

export enum TestConditionOperation {
  EQUALS = "===",
  NOT_EQUALS = "!==",
  IN = "IN",
  BETWEEN = "BETWEEN",
  CONTAINS = "CONTAINS",
  REGEX = "REGEX",
  EXT_REGEX = "EXT_REGEX",
  DEEP_EQUALS = "DEEP_EQUALS",
  ARRAY_CONTAINS = "ARRAY_CONTAINS",
  ARRAY_EQUALS = "ARRAY_EQUALS",
}

export type BaseTestCondition = {
  conditions: unknown[];
};

export type TestCondition = BaseTestCondition &
  (
    | {
        operation?:
          | TestConditionOperation.EQUALS
          | TestConditionOperation.NOT_EQUALS;
        expectation: string | number | boolean;
      }
    | {
        operation:
          | TestConditionOperation.IN
          | TestConditionOperation.ARRAY_CONTAINS;
        expectation: unknown[];
      }
    | {
        operation: TestConditionOperation.BETWEEN;
        expectation: [number, number];
      }
    | {
        operation: TestConditionOperation.CONTAINS;
        expectation: string;
      }
    | {
        operation: TestConditionOperation.REGEX;
        expectation: RegexExpectation;
      }
    | {
        operation: TestConditionOperation.EXT_REGEX;
        expectation: EXTRegexExpectation;
      }
    | {
        operation: TestConditionOperation.DEEP_EQUALS;
        expectation: Record<string, unknown>;
      }
    | {
        operation: TestConditionOperation.ARRAY_EQUALS;
        expectation: unknown[];
      }
  );

export type TestConfig = {
  subject: {
    file: string;
    export: string;
  };
  tests: TestCondition[];
};

export type PatternElement = {
  value: string;
  escaped?: boolean;
};

export type EXTRegexExpectation = {
  pattern: PatternElement[];
  flags?: string;
};

export type RegexExpectation = {
  pattern: string;
  flags?: string;
};

// Supported operations for test expectations
export const OPERATIONS: Record<
  TestConditionOperation,
  (a: unknown, b: unknown) => boolean
> = {
  [TestConditionOperation.EQUALS]: (a, b) => a === b,
  [TestConditionOperation.NOT_EQUALS]: (a, b) => a !== b,
  [TestConditionOperation.IN]: (a, b) => Array.isArray(b) && b.includes(a),
  [TestConditionOperation.BETWEEN]: (a, b) => {
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
  [TestConditionOperation.CONTAINS]: (a, b) =>
    typeof a === "string" && typeof b === "string" && a.includes(b),
  [TestConditionOperation.REGEX]: (a, b) => {
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
  [TestConditionOperation.EXT_REGEX]: (a, b) => {
    if (typeof b === "object" && b !== null && "pattern" in b) {
      const { pattern, flags } = b as EXTRegexExpectation;
      const buildRegexFromPattern = (
        pattern: PatternElement[],
        flags = "",
      ): RegExp => {
        if (!Array.isArray(pattern)) {
          throw new Error("EXT_REGEX pattern must be an array of objects.");
        }

        // Build the regex string
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
  [TestConditionOperation.DEEP_EQUALS]: (a, b) => {
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
  [TestConditionOperation.ARRAY_CONTAINS]: (a, b) => {
    if (Array.isArray(a)) {
      return a.includes(b);
    }
    throw new Error("ARRAY_CONTAINS requires an array as the first argument.");
  },
  [TestConditionOperation.ARRAY_EQUALS]: (a, b) => {
    if (Array.isArray(a) && Array.isArray(b)) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    throw new Error("ARRAY_EQUALS requires two arrays as arguments.");
  },
};

export const compare = (
  result: unknown,
  expectation: unknown,
  operation: TestConditionOperation = TestConditionOperation.EQUALS,
): boolean => {
  const op = OPERATIONS[operation];
  if (!op) {
    throw new Error(`Unsupported operation: ${operation}`);
  }
  return op(result, expectation);
};

export const runTest = async (
  testFunction: (...args: unknown[]) => Promise<unknown> | unknown,
  test: TestCondition,
  index: number,
): Promise<void> => {
  const { conditions, expectation, operation } = test;
  try {
    const result = await testFunction(...conditions);
    const passed = compare(result, expectation, operation);
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

export const runTestsForFile = async (testFilePath: string): Promise<void> => {
  try {
    const testConfig: TestConfig = JSON.parse(
      await FS.readFile(testFilePath, "utf8"),
    );
    const { subject, tests } = testConfig;

    if (!subject || !subject.file || !subject.export) {
      throw new Error(`Invalid subject configuration in ${testFilePath}`);
    }

    const modulePath = Path.resolve(Path.dirname(testFilePath), subject.file);
    const module = require(modulePath);
    const testFunction = module[subject.export];

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
 * Use the `TestUtils` as a CLI to run all of the tests in a specified directory.
 * */
export const runTests = async (testPath: string): Promise<void> => {
  try {
    const testFiles = await fastGlob(testPath);

    if (testFiles.length === 0) {
      console.warn(`No test files found in ${testPath}`);
      return;
    }

    for (const testFile of testFiles) {
      await runTestsForFile(Path.resolve(testFile));
    }

    console.log("Testing complete.");
  } catch (err: any) {
    console.error(`Error running tests: ${err.message}`);
  }
};

// CLI entry point
if (require.main === module) {
  const testPath = process.argv[2];

  if (!testPath) {
    console.error("Usage: vest <test-directory-path>");
    process.exit(1);
  }

  runTests(testPath);
}
