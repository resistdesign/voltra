import { logFunctionCall, LOGGING_MESSAGES } from "./Utils";

const runLoggingUtilsScenario = async () => {
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
  const circularArg: { self?: unknown } = {};
  circularArg.self = circularArg;
  const circularResult = await logFunctionCall(
    "circularThing",
    [circularArg],
    () => "ok",
    true,
  );

  console.log = originalLog;
  console.error = originalError;

  return {
    result,
    disabledResult,
    circularResult,
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

export const runLoggingUtilsResultScenario = async () =>
  (await runLoggingUtilsScenario()).result;

export const runLoggingUtilsDisabledResultScenario = async () =>
  (await runLoggingUtilsScenario()).disabledResult;

export const runLoggingUtilsCircularResultScenario = async () =>
  (await runLoggingUtilsScenario()).circularResult;

export const runLoggingUtilsThrownMessageScenario = async () =>
  (await runLoggingUtilsScenario()).thrownMessage;

export const runLoggingUtilsLogMessagesScenario = async () =>
  (await runLoggingUtilsScenario()).logMessages;

export const runLoggingUtilsErrorMessagesScenario = async () =>
  (await runLoggingUtilsScenario()).errorMessages;

export const runLoggingUtilsExpectedLabelsScenario = async () =>
  (await runLoggingUtilsScenario()).expectedLabels;

export const runLoggingUtilsExpectedOutputLabelsScenario = async () =>
  (await runLoggingUtilsScenario()).expectedOutputLabels;

export const runLoggingUtilsExpectedErrorLabelsScenario = async () =>
  (await runLoggingUtilsScenario()).expectedErrorLabels;
