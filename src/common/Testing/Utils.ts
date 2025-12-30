/**
 * @packageDocumentation
 *
 * Helpers for executing JSON spec tests, including expectation generation.
 */
import {
  ConditionConfig,
  EXTRegexExpectation,
  PatternElement,
  RegexExpectation,
  ResolvedTestConfig,
  Test,
  TestComparisonOperation,
  TestConfig,
  TestResults,
} from "./Types";
import { promises as FS } from "fs";
import Path from "path";
import { pathToFileURL } from "url";

const importModule = async (modulePath: string): Promise<any> => {
  const moduleUrl = pathToFileURL(modulePath);
  return import(moduleUrl.href);
};

const stringifyOutput = (value: any): string =>
  JSON.stringify(
    value,
    function (this: any, _key: string, value: any) {
      return typeof value === "function" ? "[Function]" : value;
    },
    2,
  );

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
            if (typeof (value as unknown) !== "string") {
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
 *
 * @param result - Actual test result.
 * @param expectation - Expected value.
 * @param operation - Comparison operation to use.
 * @returns Whether the result matches the expectation.
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
 * Get the target module for testing from a file being tested.
 *
 * @param testFilePath - Path to the test file.
 * @param targetTestIndex - Index of the test in the test array.
 * @param targetTestExport - Export name for the test.
 * @param conditions - Conditions array or config to load.
 * @param isSetup - Whether the conditions are for setup.
 * @returns Resolved conditions array.
 * */
export const getResolvedConditions = async (
  testFilePath: string,
  targetTestIndex: number,
  targetTestExport: string,
  conditions: unknown[] | ConditionConfig,
  isSetup: boolean = false,
): Promise<unknown[]> => {
  if (Array.isArray(conditions)) {
    return conditions;
  } else if (typeof conditions === "object" && conditions !== null) {
    const { file, export: targetConditionExport } =
      conditions as ConditionConfig;
    const modulePath = Path.resolve(Path.dirname(testFilePath), file);
    const targetModule = await importModule(modulePath);
    const conditionArray = targetModule[targetConditionExport];

    if (Array.isArray(conditionArray)) {
      return conditionArray;
    }
  }

  throw new Error(
    `Invalid conditions for TEST${
      isSetup ? " SETUP" : ""
    } ${targetTestIndex + 1} (${targetTestExport}) in ${testFilePath}`,
  );
};

/**
 * Get the target base instance from a module, for a given test setup.
 *
 * @param testFilePath - Path to the test file.
 * @param targetTestIndex - Index of the test in the test array.
 * @param targetTestExport - Export name for the test.
 * @param test - Test definition.
 * @param module - Required module containing exports.
 * @returns Instance to use for the test function.
 * */
export const getSetupInstance = async (
  testFilePath: string,
  targetTestIndex: number,
  targetTestExport: string,
  test: Test,
  module: any,
): Promise<any> => {
  const { setup } = test;

  if (!setup) return module;

  const { conditions: baseConditions, export: targetSetupExport } = setup;
  const setupFunction = module[targetSetupExport];
  const conditions = await getResolvedConditions(
    testFilePath,
    targetTestIndex,
    targetTestExport,
    baseConditions,
    true,
  );

  if (typeof setupFunction !== "function") {
    throw new Error(`Setup export "${setup.export}" is not a function.`);
  }

  return setup.instantiate
    ? new setupFunction(...conditions)
    : await setupFunction(...conditions);
};

/**
 * Resolve the test function from the target module or setup instance.
 *
 * @param testFilePath - Path to the test file.
 * @param file - Module file defined in the test config.
 * @param targetTestIndex - Index of the test in the test array.
 * @param test - Test definition.
 * @param targetModule - Required module containing exports.
 * @returns Test function to execute.
 */
export const getTestFunction = async (
  testFilePath: string,
  file: string,
  targetTestIndex: number,
  test: Test,
  targetModule: any,
): Promise<(...args: unknown[]) => Promise<unknown> | unknown> => {
  const { export: targetExport } = test;

  if (!targetExport) {
    throw new Error(
      `Invalid test export (${targetExport}) for TEST ${targetTestIndex + 1} in ${testFilePath}`,
    );
  }

  const instance = await getSetupInstance(
    testFilePath,
    targetTestIndex,
    targetExport,
    test,
    targetModule,
  );
  const testFunction = instance[targetExport];

  if (typeof testFunction !== "function") {
    throw new Error(
      `Export "${targetExport}" from "${file}", declared in TEST ${targetTestIndex + 1}, is not a function.`,
    );
  }

  return testFunction;
};

/**
 * Get the test configuration from a test file.
 *
 * @param testFilePath - Path to the test file.
 * @returns Parsed test config.
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
 *
 * @param testFilePath - Path to the test file.
 * @returns Resolved test config with module and tests.
 * */
export const getResolvedTestConfig = async (
  testFilePath: string,
): Promise<ResolvedTestConfig> => {
  const { file, tests } = await getTestConfig(testFilePath);

  if (!file) {
    throw new Error(`Invalid test configuration in ${testFilePath}`);
  }

  const modulePath = Path.resolve(Path.dirname(testFilePath), file);
  const targetModule = await importModule(modulePath);

  return {
    file,
    targetModule,
    tests,
  };
};

/**
 * Merge multiple test results into a single result.
 *
 * @param results - Test result sets to merge.
 * @returns Combined test results.
 * */
export const mergeTestResults = (...results: TestResults[]): TestResults =>
  results.reduce(
    (
      {
        messages: accMessages = [],
        generated: accGenerated = [],
        passes: accPasses = [],
        failures: accFailures = [],
        errors: accErrors = [],
      },
      {
        messages = [],
        generated = [],
        passes = [],
        failures = [],
        errors = [],
      },
    ) => ({
      messages: [...accMessages, ...messages],
      generated: [...accGenerated, ...generated],
      passes: [...accPasses, ...passes],
      failures: [...accFailures, ...failures],
      errors: [...accErrors, ...errors],
    }),
    { messages: [], passes: [], failures: [], errors: [] } as TestResults,
  );

/**
 * Run a test using a test function and a test condition.
 *
 * @param testFilePath - Path to the test file.
 * @param testFunction - Test function to execute.
 * @param test - Test definition.
 * @param index - Test index in the list.
 * @param targetExport - Export name for the test.
 * @param report - Reporter for test results.
 * @returns Resolves when the test completes.
 * */
export const runTest = async (
  testFilePath: string,
  testFunction: (...args: unknown[]) => Promise<unknown> | unknown,
  test: Test,
  index: number,
  targetExport: string,
  report: (results: TestResults) => void,
): Promise<void> => {
  const {
    conditions: baseConditions,
    expectation,
    operation,
    expectUndefined,
  } = test;
  const conditions = await getResolvedConditions(
    testFilePath,
    index,
    targetExport,
    baseConditions,
  );

  try {
    const result = await testFunction(...conditions);
    const passed = expectUndefined || compare(result, expectation, operation);

    if (passed) {
      report({
        passes: [`Test ${index + 1} (${targetExport})`],
      });
    } else {
      report({
        failures: [
          `Test ${index + 1} (${targetExport}):

Result:

${stringifyOutput(result)}`,
        ],
      });
    }
  } catch (err: any) {
    report({
      errors: [
        `Test ${index + 1} (${targetExport}):

Error:

${err.message}`,
      ],
    });
  }
};

/**
 * Generate tests for a file by running the tests, capturing the current result and storing it as the new expectation.
 *
 * @param testFilePath - Path to the test file.
 * @param report - Reporter for test results.
 * @returns Resolves when generation completes.
 * */
export const generateTestsForFile = async (
  testFilePath: string,
  report: (results: TestResults) => void,
): Promise<void> => {
  try {
    const { file, targetModule, tests } =
      await getResolvedTestConfig(testFilePath);

    report({
      messages: [`Generating expectations for tests in ${testFilePath}`],
    });

    const generatedTests = [];
    let hasNewExpectations = false;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i] as Test;

      const {
        export: targetExport,
        conditions: baseConditions,
        expectation,
        operation,
        expectUndefined,
      } = test;
      const conditions = await getResolvedConditions(
        testFilePath,
        i,
        targetExport,
        baseConditions,
      );

      if (expectation !== undefined || expectUndefined) {
        // IMPORTANT: Skip if expectation already exists
        generatedTests.push(test);
      } else {
        const testFunction = await getTestFunction(
          testFilePath,
          file,
          i,
          test,
          targetModule,
        );
        const result = await testFunction(...conditions);

        report({
          generated: [
            `Expectation for TEST ${i + 1} (${targetExport}):

${stringifyOutput(result)}`,
          ],
        });
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

      report({ messages: [`Updated test file saved to ${testFilePath}`] });
    } else {
      report({
        messages: [`No new expectations were generated for ${testFilePath}`],
      });
    }
  } catch (err: any) {
    report({
      errors: [`Error processing test file ${testFilePath}:\n\n${err.message}`],
    });
  }
};

/**
 * Run the tests for a given test file.
 *
 * The test file content is expected to be a JSON in the structure of a `TestConfig`.
 *
 * @param testFilePath - Path to the test file.
 * @param report - Reporter for test results.
 * @returns Resolves when tests finish.
 * */
export const runTestsForFile = async (
  testFilePath: string,
  report: (results: TestResults) => void,
): Promise<void> => {
  try {
    const { file, targetModule, tests } =
      await getResolvedTestConfig(testFilePath);

    report({
      messages: [`Running tests from ${testFilePath}`],
    });

    for (const [index, test] of tests.entries()) {
      const { export: targetExport } = test;
      const testFunction = await getTestFunction(
        testFilePath,
        file,
        index,
        test,
        targetModule,
      );

      await runTest(
        testFilePath,
        testFunction,
        test,
        index,
        targetExport,
        report,
      );
    }
  } catch (err: any) {
    report({
      errors: [`Error processing test file ${testFilePath}: ${err.message}`],
    });
  }
};

/**
 * Run or generate all of the tests in the specified `testPath` glob.
 *
 * @param testFiles - Test file paths to execute.
 * @param generateMode - Whether to generate expectations.
 * @param report - Reporter for test results.
 * @returns Resolves when execution completes.
 * */
export const executeTestingCommand = async (
  testFiles: string[],
  generateMode = false,
  report: (results: TestResults) => void,
): Promise<void> => {
  const completeMessage = generateMode
    ? "Test generation complete."
    : "Testing complete.";

  try {
    for (const testFile of testFiles) {
      const resolvedTestFile = Path.resolve(testFile);

      if (generateMode) {
        await generateTestsForFile(resolvedTestFile, report);
      } else {
        await runTestsForFile(resolvedTestFile, report);
      }
    }

    report({
      messages: [completeMessage],
    });
  } catch (err: any) {
    report({ errors: [`Error running tests:\n\n${err.message}`] });
  }
};
