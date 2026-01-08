/**
 * Collect required environment variables or throw with a missing-name error.
 *
 * @typeParam VarName - Allowed environment variable names.
 * @param varNames - List of required environment variable names.
 * @returns Map of environment variable names to values.
 * @throws Error when a required variable is missing or empty.
 */
export const collectRequiredEnvironmentVariables = <VarName extends string>(
  varNames: VarName[],
): Record<VarName, string> => {
  const result: Record<VarName, string> = {} as any;
  const missingEnvVars: VarName[] = [];

  for (const vN of varNames) {
    const value: string | undefined = process.env[vN];

    // IMPORTANT: Verify that we have all required environment variables.
    if (!value) {
      missingEnvVars.push(vN);
    } else {
      result[vN] = value;
    }
  }

  if (missingEnvVars.length > 0) {
    throw new Error(
      `
┌──────────────────────────────────┐
│   ⚠  ENVIRONMENT CHECK FAILED    │
└──────────────────────────────────┘

Missing Required Environment Variables:

${missingEnvVars.map((vN) => `- ${vN}`).join(`
`)}
`,
    );
  }

  return result;
};
