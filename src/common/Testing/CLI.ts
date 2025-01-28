#!/usr/bin/env ts-node

import { executeTestingCommand, mergeTestResults } from "./Utils";
import fastGlob from "fast-glob";
import picocolors from "picocolors";
import { TestResults } from "./Types";

export const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const generateMode = args.includes("--generate");
  const testPath = args.filter((arg) => arg !== "--generate")[0];

  if (!testPath) {
    console.error("Usage: vest [--generate] <test-directory-path>");
    process.exit(1);
  }

  const testFiles = await fastGlob(testPath);

  if (testFiles.length === 0) {
    console.warn(`No test files found in ${testPath}`);

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
        passes = [],
        failures = [],
        errors = [],
      } = latestResults;

      results = mergeTestResults(results, latestResults);

      messages.forEach((message) =>
        console.log(`${picocolors.blue("MESSAGE:")} ${message}`),
      );
      passes.forEach((pass) =>
        console.log(`${picocolors.green("PASSED:")} ${pass}`),
      );
      failures.forEach((failure) =>
        console.error(`${picocolors.red("FAILED:")} ${failure}`),
      );
      errors.forEach((error) =>
        console.error(`${picocolors.redBright("ERROR:")} ${error}`),
      );
    },
  );

  const { failures = [], errors = [] } = results;
  const exitValue = failures.length + errors.length;

  process.exit(exitValue);
};

main().then();
