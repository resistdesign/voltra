import {
  CUSTOM_STRING_TRANSFORMERS,
  STRING_TRANSFORMERS,
  transformValueToString,
} from "./StringTransformers";

export const runStringTransformersScenario = () => {
  const date = new Date("2020-01-01T00:00:00.000Z");

  const stringValue = transformValueToString("hello", "string");
  const numberValue = transformValueToString(42, "number");
  const booleanTrue = transformValueToString(true, "boolean");
  const booleanFalse = transformValueToString(false, "boolean");
  const nullValue = transformValueToString(null, "string");

  const customDate = transformValueToString(date, "string", "date");
  const customUnknown = transformValueToString(123, "string", "unknown");
  const customFallback = transformValueToString(123, "string", "missing");

  return {
    stringValue,
    numberValue,
    booleanTrue,
    booleanFalse,
    nullValue,
    customDate,
    customUnknown,
    customFallback,
    keywords: Object.keys(STRING_TRANSFORMERS).sort(),
    customKeys: Object.keys(CUSTOM_STRING_TRANSFORMERS).sort(),
  };
};
