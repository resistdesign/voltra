import { collectRequiredEnvironmentVariables } from "./collectRequiredEnvironmentVariables";

export const runCollectRequiredEnvironmentVariablesScenario = () => {
  const varNames = ["VOLTRA_A", "VOLTRA_B"] as const;
  const originalValues = {
    VOLTRA_A: process.env.VOLTRA_A,
    VOLTRA_B: process.env.VOLTRA_B,
  };

  let collected: Record<(typeof varNames)[number], string> | null = null;
  let missingThrown = false;
  let missingMessage = "";

  try {
    process.env.VOLTRA_A = "alpha";
    process.env.VOLTRA_B = "bravo";
    collected = collectRequiredEnvironmentVariables([...varNames]);

    delete process.env.VOLTRA_B;
    collectRequiredEnvironmentVariables([...varNames]);
  } catch (error) {
    missingThrown = true;
    missingMessage = error instanceof Error ? error.message : String(error);
  } finally {
    if (originalValues.VOLTRA_A === undefined) {
      delete process.env.VOLTRA_A;
    } else {
      process.env.VOLTRA_A = originalValues.VOLTRA_A;
    }

    if (originalValues.VOLTRA_B === undefined) {
      delete process.env.VOLTRA_B;
    } else {
      process.env.VOLTRA_B = originalValues.VOLTRA_B;
    }
  }

  return {
    collected,
    missingThrown,
    missingMessage,
  };
};
