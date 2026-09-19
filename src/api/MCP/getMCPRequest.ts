import type { NormalizedCloudFunctionEventData } from "../Router";

const getRequestHeaders = (
  eventData: NormalizedCloudFunctionEventData,
): Headers => {
  const headers = new Headers();

  for (const key in eventData.headers) {
    const values = eventData.headers[key];

    for (const value of values) {
      headers.append(key, value);
    }
  }

  return headers;
};

const getRequestURL = (
  eventData: NormalizedCloudFunctionEventData,
): string => {
  const path = eventData.path.startsWith("/")
    ? eventData.path
    : `/${eventData.path}`;

  return `https://voltra.local${path}`;
};

/**
 * Convert a normalized Voltra cloud-function event into a web Request for the
 * MCP server runtime.
 */
export const getMCPRequest = (
  eventData: NormalizedCloudFunctionEventData,
): Request => {
  const method = eventData.method.toUpperCase();
  const canHaveBody = method !== "GET" && method !== "HEAD";
  const body =
    canHaveBody && eventData.body !== undefined
      ? JSON.stringify(eventData.body)
      : undefined;

  return new Request(getRequestURL(eventData), {
    method,
    headers: getRequestHeaders(eventData),
    body,
  });
};
