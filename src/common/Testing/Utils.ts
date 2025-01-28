import {
  EXTRegexExpectation,
  PatternElement,
  RegexExpectation,
  ResolvedTestConfig,
  Test,
  TestComparisonOperation,
  TestConfig,
  TestSetup,
} from "./Types";
import { promises as FS } from "fs";
import Path from "path";
import fastGlob from "fast-glob";

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

export const getTestFunction = async (
  testFilePath: string,
  file: string,
  targetModule: any,
  setup: TestSetup | undefined,
  targetExport: string,
): Promise<(...args: unknown[]) => Promise<unknown> | unknown> => {
  if (!targetExport) {
    throw new Error(`Invalid test export in ${testFilePath}`);
  }

  const instance = await getSetupInstance(targetModule, setup);
  const testFunction = instance[targetExport];

  if (typeof testFunction !== "function") {
    throw new Error(
      `Export "${targetExport}" from "${file}" is not a function.`,
    );
  }

  return testFunction;
};

/**
 * Get the test configuration from a test file.
 * */
export const getTestConfig = async (
  testFilePath: string,
): Promise<TestConfig> => {
  const testConfig: TestConfig = JSON.parse(
    await FS.readFile(testFilePath, "utf8"),
  );

  return testConfig;
};

/**
 * Get the target module for testing from a file being tested.
 * */
export const getResolvedTestConfig = async (
  testFilePath: string,
): Promise<ResolvedTestConfig> => {
  const { file, tests } = await getTestConfig(testFilePath);

  if (!file) {
    throw new Error(`Invalid test configuration in ${testFilePath}`);
  }

  const modulePath = Path.resolve(Path.dirname(testFilePath), file);
  const targetModule = require(modulePath);

  return {
    file,
    targetModule,
    tests,
  };
};

/**
 * Run a test using a test function and a test condition.
 * */
export const runTest = async (
  testFunction: (...args: unknown[]) => Promise<unknown> | unknown,
  test: Test,
  index: number,
): Promise<number> => {
  const { conditions, expectation, operation, expectUndefined } = test;

  let failureCount = 0;

  try {
    const result = await testFunction(...conditions);
    const passed = expectUndefined || compare(result, expectation, operation);
    if (passed) {
      console.log(
        `  Test ${index + 1}: PASSED - Conditions: ${JSON.stringify(conditions)}`,
      );
    } else {
      failureCount++;

      console.error(
        `  Test ${index + 1}: FAILED - Conditions: ${JSON.stringify(conditions)}, Expectation: ${JSON.stringify(expectation)}, Result: ${JSON.stringify(result)}`,
      );
    }
  } catch (err: any) {
    failureCount++;

    console.error(
      `  Test ${index + 1}: ERROR - Conditions: ${JSON.stringify(conditions)}, Error: ${err.message}`,
    );
  }

  return failureCount;
};

/**
 * Generate tests for a file by running the tests, capturing the current result and storing it as the new expectation.
 * */
export const generateTestsForFile = async (
  testFilePath: string,
): Promise<void> => {
  try {
    const { file, targetModule, tests } =
      await getResolvedTestConfig(testFilePath);

    console.log(`Generating tests for ${testFilePath}`);

    const generatedTests = [];
    let hasNewExpectations = false;

    for (const test of tests) {
      const {
        setup,
        export: targetExport,
        conditions,
        expectation,
        operation,
        expectUndefined,
      } = test;

      if (expectation !== undefined || expectUndefined) {
        // IMPORTANT: Skip if expectation already exists
        generatedTests.push(test);
      } else {
        const testFunction = await getTestFunction(
          testFilePath,
          file,
          targetModule,
          setup,
          targetExport,
        );
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
    }

    if (hasNewExpectations) {
      const updatedTestConfig = { file, tests: generatedTests };

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
export const runTestsForFile = async (
  testFilePath: string,
): Promise<number> => {
  let failureCount = 0;

  try {
    const { targetModule, tests } = await getResolvedTestConfig(testFilePath);

    console.log(`Running tests from ${testFilePath}`);

    for (const [index, test] of tests.entries()) {
      const { setup, export: targetExport } = test;
      const testFunction = await getTestFunction(
        testFilePath,
        targetModule,
        targetModule,
        setup,
        targetExport,
      );

      failureCount += await runTest(testFunction, test, index);
    }
  } catch (err: any) {
    console.error(`Error processing test file ${testFilePath}: ${err.message}`);
  }

  return failureCount;
};

/**
 * Run or generate all of the tests in the specified `testPath` glob.
 * */
export const executeTestingCommand = async (
  testPath: string,
  generateMode = false,
): Promise<number> => {
  let failureCount = 0;

  try {
    const testFiles = await fastGlob(testPath);

    if (testFiles.length === 0) {
      console.warn(`No test files found in ${testPath}`);

      return failureCount;
    }

    for (const testFile of testFiles) {
      const resolvedTestFile = Path.resolve(testFile);

      if (generateMode) {
        await generateTestsForFile(resolvedTestFile);
      } else {
        failureCount += await runTestsForFile(resolvedTestFile);
      }
    }

    console.log("Testing complete.");
  } catch (err: any) {
    console.error(`Error running tests: ${err.message}`);
  }

  return failureCount;
};
