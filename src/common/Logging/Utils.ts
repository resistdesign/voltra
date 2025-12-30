/**
 * Logging tags used by {@link logFunctionCall}.
 */
export enum LOGGING_MESSAGES {
  LOGGING_FUNCTION_CALL = "LOGGING_FUNCTION_CALL",
  INPUT = "INPUT",
  OUTPUT = "OUTPUT",
  ERROR = "ERROR",
}

/**
 * Make a function call and log input/output/errors when enabled.
 *
 * @param label - Label to include in logs.
 * @param args - Arguments passed to the function.
 * @param functionRef - Function to execute.
 * @param enabled - Whether to emit logs.
 * @returns The function result.
 */
export const logFunctionCall = async (
  label: string,
  args: any[],
  functionRef: (...args: any[]) => Promise<any> | any,
  enabled: boolean,
): Promise<any> => {
  if (enabled) {
    console.log(
      LOGGING_MESSAGES.LOGGING_FUNCTION_CALL,
      LOGGING_MESSAGES.INPUT,
      label,
      ":",
      JSON.stringify(args, null, 2),
    );
  }

  try {
    const result = await functionRef(...args);

    if (enabled) {
      console.log(
        LOGGING_MESSAGES.LOGGING_FUNCTION_CALL,
        LOGGING_MESSAGES.OUTPUT,
        label,
        ":",
        JSON.stringify(result, null, 2),
      );
    }

    return result;
  } catch (error) {
    if (enabled) {
      console.error(
        LOGGING_MESSAGES.LOGGING_FUNCTION_CALL,
        LOGGING_MESSAGES.ERROR,
        label,
        ":",
        error,
      );
    }

    // IMPORTANT: Rethrow the error after logging it.
    throw error;
  }
};
