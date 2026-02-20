import {
  CUSTOM_STRING_TRANSFORMERS,
  STRING_TRANSFORMERS,
  transformValueToString,
} from "./StringTransformers";

export const runStringTransformerStringScenario = () =>
  transformValueToString("hello", "string");

export const runStringTransformerNumberScenario = () =>
  transformValueToString(42, "number");

export const runStringTransformerBooleanTrueScenario = () =>
  transformValueToString(true, "boolean");

export const runStringTransformerBooleanFalseScenario = () =>
  transformValueToString(false, "boolean");

export const runStringTransformerNullScenario = () =>
  transformValueToString(null, "string");

export const runStringTransformerCustomDateScenario = () => {
  const date = new Date("2020-01-01T00:00:00.000Z");
  return transformValueToString(date, "string", "date");
};

export const runStringTransformerCustomUnknownScenario = () =>
  transformValueToString(123, "string", "unknown");

export const runStringTransformerCustomFallbackScenario = () =>
  transformValueToString(123, "string", "missing");

export const runStringTransformerKeywordKeysScenario = () =>
  Object.keys(STRING_TRANSFORMERS).sort();

export const runStringTransformerCustomKeysScenario = () =>
  Object.keys(CUSTOM_STRING_TRANSFORMERS).sort();
