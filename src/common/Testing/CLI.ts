#!/usr/bin/env ts-node

import { executeTestingCommand } from "./Utils";
import fastGlob from "fast-glob";

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

  const {
    messages = [],
    passes = [],
    failures = [],
    errors = [],
  } = await executeTestingCommand(testFiles, generateMode);
  const exitValue = failures.length + errors.length;

  messages.forEach((message) => console.log(message));
  passes.forEach((pass) => console.log(pass));
  failures.forEach((failure) => console.error(failure));
  errors.forEach((error) => console.error(error));

  process.exit(exitValue);
};

main().then();
