import { TypeKeyword } from "./TypeParsing/TypeInfo";

export type StringTransformer = (value: any) => string;

const transformWhenStringExpected = (value: any) =>
  (value ?? false) === false ? "" : `${value}`;

export const STRING_TRANSFORMERS: Record<TypeKeyword, StringTransformer> = {
  string: transformWhenStringExpected,
  number: transformWhenStringExpected,
  boolean: (value: any) => (value ? "true" : "false"),
};

export const CUSTOM_STRING_TRANSFORMERS: Record<string, StringTransformer> = {
  date: (value: any) => (value as Date).toISOString(),
  time: (value: any) => (value as Date).toISOString(),
  datetime: (value: any) => (value as Date).toISOString(),
  duration: (value: any) => value.toString(),
  reference: (value: any) => value.toString(),
  unknown: (value: any) => value.toString(),
};

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
