import { CORSPatter } from "./Types";

/**
 * Check origin equality against an allowed string.
 * */
export const originMatchesString = (
  origin: string = "",
  str: string = "",
): boolean => str === origin;

/**
 * Check origin match against an allowed regular expression.
 * */
export const originMatchesRegExp = (
  origin: string = "",
  regExp: RegExp = /^$/,
): boolean => !!regExp.test(origin);

/**
 * Check an origin against a string or regex CORS pattern.
 * */
export const originMatches = (
  origin: string = "",
  corsPattern: CORSPatter = "",
): boolean => {
  if (typeof corsPattern === "string") {
    return originMatchesString(origin, corsPattern);
  } else {
    return originMatchesRegExp(origin, corsPattern);
  }
};

/**
 * Resolve the origin if it is allowed by the CORS patterns.
 * */
export const getAllowedCORSOrigin = (
  origin: string = "",
  corsPatterns: CORSPatter[] = [],
): string =>
  !!corsPatterns.find((cP) => originMatches(origin, cP)) ? origin : "";

/**
 * Build CORS response headers for a given origin and allow list.
 * */
export const getHeadersWithCORS = (
  origin: string = "",
  corsPatterns: CORSPatter[] = [],
): Record<string, string> => {
  return {
    "Access-Control-Allow-Origin": getAllowedCORSOrigin(origin, corsPatterns),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    "Access-Control-Allow-Methods":
      "OPTIONS, HEAD, GET, POST, PUT, PATCH, DELETE",
  };
};
