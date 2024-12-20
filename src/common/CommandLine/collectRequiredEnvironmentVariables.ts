export const collectRequiredEnvironmentVariables = <VarName extends string>(
  varNames: VarName[],
): Record<VarName, string> => {
  const result: Record<VarName, string> = {} as any;

  for (const vN of varNames) {
    const value: string | undefined = process.env[vN];

    // IMPORTANT: Verify that we have all required environment variables.
    if (!value) {
      throw new Error(`Missing required environment variable: ${vN}`);
    }

    result[vN] = value;
  }

  return result;
};
