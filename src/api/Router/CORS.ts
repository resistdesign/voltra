import { CORSPatter } from "./Types";

/**
 * Check origin equality against an allowed string.
 * @returns True when the origin exactly matches the string.
 * */
export const originMatchesString = (
  /**
   * Origin value from the request.
   */
  origin: string = "",
  /**
   * Allowed origin string to compare against.
   */
  str: string = "",
): boolean => str === origin;

/**
 * Check origin match against an allowed regular expression.
 * @returns True when the origin matches the pattern.
 * */
export const originMatchesRegExp = (
  /**
   * Origin value from the request.
   */
  origin: string = "",
  /**
   * Allowed origin pattern to test against.
   */
  regExp: RegExp = /^$/,
): boolean => !!regExp.test(origin);

/**
 * Check an origin against a string or regex CORS pattern.
 * @returns True when the origin matches the allowed pattern.
 * */
export const originMatches = (
  /**
   * Origin value from the request.
   */
  origin: string = "",
  /**
   * Allowed origin matcher (string equality or regex test).
   */
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
 * @returns The origin if allowed, otherwise an empty string.
 * */
export const getAllowedCORSOrigin = (
  /**
   * Origin value from the request.
   */
  origin: string = "",
  /**
   * Allowed origin matchers to check.
   */
  corsPatterns: CORSPatter[] = [],
): string =>
  !!corsPatterns.find((cP) => originMatches(origin, cP)) ? origin : "";

/**
 * Build CORS response headers for a given origin and allow list.
 * @returns CORS headers for the response.
 * */
export const getHeadersWithCORS = (
  /**
   * Origin value from the request.
   */
  origin: string = "",
  /**
   * Allowed origin matchers to check.
   */
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
