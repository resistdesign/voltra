#!/usr/bin/env ts-node

import { executeTestingCommand } from "./Utils";

// CLI entry point.
if (require.main === module) {
  const args = process.argv.slice(2);
  const generateMode = args.includes("--generate");
  const testPath = args.filter((arg) => arg !== "--generate")[0];

  if (!testPath) {
    console.error("Usage: vest [--generate] <test-directory-path>");
    process.exit(1);
  }

  executeTestingCommand(testPath, generateMode).then((failureCount) => {
    process.exit(failureCount);
  });
}
