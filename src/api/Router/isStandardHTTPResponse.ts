/**
 * Check whether a value is a standard Web API HTTP Response.
 *
 * Keeping this runtime detection isolated lets Router consumers remain
 * independent of the concrete global Response implementation.
 *
 * @returns True when the value is a standard HTTP Response.
 */
export const isStandardHTTPResponse = (
  value: unknown,
): value is Response =>
  typeof Response !== "undefined" && value instanceof Response;
