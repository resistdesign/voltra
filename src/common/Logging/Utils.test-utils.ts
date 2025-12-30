import { logFunctionCall, LOGGING_MESSAGES } from "./Utils";

export const runLoggingUtilsScenario = async () => {
  const originalLog = console.log;
  const originalError = console.error;
  const logs: any[] = [];
  const errors: any[] = [];

  console.log = (...args: any[]) => {
    logs.push(args);
  };
  console.error = (...args: any[]) => {
    errors.push(args);
  };

  const result = await logFunctionCall(
    "doThing",
    [1, "two"],
    async (a: number, b: string) => `${a}-${b}`,
    true,
  );

  let thrownMessage = "";
  try {
    await logFunctionCall(
      "failThing",
      [],
      () => {
        throw new Error("boom");
      },
      true,
    );
  } catch (error) {
    thrownMessage = error instanceof Error ? error.message : String(error);
  }

  const disabledResult = await logFunctionCall(
    "silent",
    ["a"],
    (value: string) => value.toUpperCase(),
    false,
  );

  console.log = originalLog;
  console.error = originalError;

  return {
    result,
    disabledResult,
    thrownMessage,
    logMessages: logs.map((entry) => entry.slice(0, 4)),
    errorMessages: errors.map((entry) => entry.slice(0, 4)),
    expectedLabels: [
      LOGGING_MESSAGES.LOGGING_FUNCTION_CALL,
      LOGGING_MESSAGES.INPUT,
      "doThing",
      ":",
    ],
    expectedOutputLabels: [
      LOGGING_MESSAGES.LOGGING_FUNCTION_CALL,
      LOGGING_MESSAGES.OUTPUT,
      "doThing",
      ":",
    ],
    expectedErrorLabels: [
      LOGGING_MESSAGES.LOGGING_FUNCTION_CALL,
      LOGGING_MESSAGES.ERROR,
      "failThing",
      ":",
    ],
  };
};
