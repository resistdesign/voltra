#!/usr/bin/env ts-node

/**
 * @packageDocumentation
 *
 * CLI entry helpers for the JSON spec test runner.
 */
import { executeTestingCommand, mergeTestResults } from "./Utils";
import fastGlob from "fast-glob";
import picocolors from "picocolors";
import { TestResults } from "./Types";

export const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const generateMode = args.includes("--generate");
  const testPaths = args.filter((arg) => arg !== "--generate");

  console.log(`${picocolors.bgMagenta(picocolors.whiteBright(" VEST "))}\n`);

  if (testPaths.length === 0) {
    console.error("Usage: vest [--generate] <test-directory-path>");
    process.exit(1);
  }

  const testFiles = await fastGlob(testPaths);

  if (testFiles.length === 0) {
    console.warn(`No test files found in ${testPaths.join(", ")}`);

    process.exit(0);
  }

  let results: TestResults = {
    messages: [],
    passes: [],
    failures: [],
    errors: [],
  };

  await executeTestingCommand(
    testFiles,
    generateMode,
    (latestResults: TestResults) => {
      const {
        messages = [],
        generated = [],
        passes = [],
        failures = [],
        errors = [],
      } = latestResults;

      results = mergeTestResults(results, latestResults);

      messages.forEach((message) =>
        console.log(`${picocolors.blueBright("MESSAGE:")} ${message}\n`),
      );
      generated.forEach((generated) =>
        console.log(`${picocolors.greenBright("GENERATED:")} ${generated}\n`),
      );
      passes.forEach((pass) =>
        console.log(`${picocolors.greenBright("PASSED:")} ${pass}\n`),
      );
      failures.forEach((failure) =>
        console.error(`${picocolors.redBright("FAILED:")} ${failure}\n`),
      );
      errors.forEach((error) =>
        console.error(
          `${picocolors.redBright(picocolors.italic("ERROR:"))} ${error}\n`,
        ),
      );
    },
  );

  const { generated = [], passes = [], failures = [], errors = [] } = results;
  const exitValue = failures.length + errors.length;

  if (generateMode) {
    console.log(`${picocolors.greenBright("GENERATED:")} ${generated.length}
${picocolors.redBright(picocolors.italic("ERRORS:"))} ${errors.length}
`);
  } else {
    console.log(`${picocolors.greenBright("PASSES:")} ${passes.length}
${picocolors.redBright("FAILURES:")} ${failures.length}
${picocolors.redBright(picocolors.italic("ERRORS:"))} ${errors.length}
`);
  }

  process.exit(exitValue);
};

main().then();
