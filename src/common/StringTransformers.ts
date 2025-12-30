/**
 * Built-in and custom string transformers for type keywords.
 */
import { TypeKeyword } from "./TypeParsing/TypeInfo";

/**
 * A function that transforms a value into a string.
 * */
export type StringTransformer = (value: any) => string;

/**
 * Transform a value into a string when a string is expected.
 * */
const transformWhenStringExpected = (value: any) =>
  (value ?? false) === false ? "" : `${value}`;

/**
 * A map of string transformers for each type keyword.
 * */
export const STRING_TRANSFORMERS: Record<TypeKeyword, StringTransformer> = {
  string: transformWhenStringExpected,
  number: transformWhenStringExpected,
  boolean: (value: any) => (value ? "true" : "false"),
};

/**
 * A map of custom string transformers for each custom type.
 * */
export const CUSTOM_STRING_TRANSFORMERS: Record<string, StringTransformer> = {
  date: (value: any) => (value as Date).toISOString(),
  time: (value: any) => (value as Date).toISOString(),
  datetime: (value: any) => (value as Date).toISOString(),
  duration: (value: any) => value.toString(),
  reference: (value: any) => value.toString(),
  unknown: (value: any) => value.toString(),
};

/**
 * Transform a value into a string based on the type keyword or custom type.
 * */
export const transformValueToString = (
  value: any,
  typeKeyword: TypeKeyword,
  customType?: string,
): string => {
  const transformer: StringTransformer | undefined = customType
    ? CUSTOM_STRING_TRANSFORMERS[customType]
    : STRING_TRANSFORMERS[typeKeyword];

  return transformer ? transformer(value) : "";
};
