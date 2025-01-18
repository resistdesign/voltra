#!/usr/bin/env ts-node

import { promises as FS } from "fs";
import Path from "path";
import fastGlob from "fast-glob";

export enum Operation {
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

export type BaseTestCondition = {
  conditions: unknown[];
};

export type TestCondition = BaseTestCondition &
  (
    | {
        operation?: Operation.EQUALS | Operation.NOT_EQUALS;
        expectation: string | number | boolean;
      }
    | {
        operation: Operation.IN | Operation.ARRAY_CONTAINS;
        expectation: unknown[];
      }
    | {
        operation: Operation.BETWEEN;
        expectation: [number, number];
      }
    | {
        operation: Operation.CONTAINS;
        expectation: string;
      }
    | {
        operation: Operation.REGEX;
        expectation: RegexExpectation;
      }
    | {
        operation: Operation.EXT_REGEX;
        expectation: EXTRegexExpectation;
      }
    | {
        operation: Operation.DEEP_EQUALS;
        expectation: Record<string, unknown>;
      }
    | {
        operation: Operation.ARRAY_EQUALS;
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

export const OPERATIONS: Record<string, (a: unknown, b: unknown) => boolean> = {
  [Operation.EQUALS]: (a, b) => a === b,
  [Operation.NOT_EQUALS]: (a, b) => a !== b,
  [Operation.IN]: (a, b) => Array.isArray(b) && b.includes(a),
  [Operation.BETWEEN]: (a, b) => {
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
  [Operation.CONTAINS]: (a, b) =>
    typeof a === "string" && typeof b === "string" && a.includes(b),
  [Operation.REGEX]: (a, b) => {
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
  [Operation.EXT_REGEX]: (a, b) => {
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
  [Operation.DEEP_EQUALS]: (a, b) => {
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
  [Operation.ARRAY_CONTAINS]: (a, b) => {
    if (Array.isArray(a)) {
      return a.includes(b);
    }
    throw new Error("ARRAY_CONTAINS requires an array as the first argument.");
  },
  [Operation.ARRAY_EQUALS]: (a, b) => {
    if (Array.isArray(a) && Array.isArray(b)) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    throw new Error("ARRAY_EQUALS requires two arrays as arguments.");
  },
};

export const compare = (
  result: unknown,
  expectation: unknown,
  operation: string = Operation.EQUALS,
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

export const generateTestsForFile = async (
  testFilePath: string,
): Promise<void> => {
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

    console.log(`Generating tests for ${testFilePath}`);

    const generatedTests = [];
    let hasNewExpectations = false;

    for (const test of tests) {
      const { conditions, expectation, operation } = test;

      if (expectation !== undefined) {
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
        conditions,
        expectation: result,
        operation: operation || Operation.EQUALS,
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
