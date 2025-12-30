import {
  AuthInfo,
  CloudFunctionEventTransformer,
  NormalizedCloudFunctionEventData,
} from "./Types";

/**
 * AWS specific utilities for processing routing and normalizing Cloud Function events.
 * */
export namespace AWS {
  /**
   * An AWS specific Cloud Function event.
   * */
  export interface IAWSCloudFunctionEvent {
    /**
     * AWS request context containing authorizer info and identity details.
     */
    requestContext?: Record<any, any>;
    /**
     * HTTP method for the incoming request.
     */
    httpMethod?: string;
    /**
     * Single-value HTTP headers.
     */
    headers?: Record<string, string>;
    /**
     * Multi-value HTTP headers keyed by header name.
     */
    multiValueHeaders?: Record<string, string[]>;
    /**
     * Request path string as provided by the AWS event.
     */
    path?: string;
    /**
     * Raw request body string (usually JSON).
     */
    body?: string;
  }

  /**
   * @returns Normalized request path string.
   */
  export const getPathFromEvent = (
    /**
     * AWS Cloud Function event to read the path from.
     */
    event: IAWSCloudFunctionEvent,
  ) => {
    const { path = "" } = event;

    return path;
  };

  /**
   * @returns Parsed body payload, or undefined if parsing fails.
   */
  export const getBodyFromEvent = (
    /**
     * AWS Cloud Function event to parse the body from.
     */
    event: IAWSCloudFunctionEvent,
  ): any => {
    const { body = "" } = event;

    try {
      const bodyValue: any = JSON.parse(body);

      return bodyValue;
    } catch (error) {
      return undefined;
    }
  };

  /**
   * @returns Normalized headers keyed by lowercase header name.
   */
  export const getHeadersFromEvent = (
    /**
     * AWS Cloud Function event to read headers from.
     */
    event: IAWSCloudFunctionEvent,
  ): Record<string, string[]> => {
    const { headers = {}, multiValueHeaders = {} } = event;
    const mergedHeaders: Record<string, string | string[]> = {
      ...headers,
      ...multiValueHeaders,
    };
    const normalizedHeaders: Record<string, string[]> = Object.keys(
      mergedHeaders,
    ).reduce((acc, key) => {
      const value = mergedHeaders[key];
      const normalizedKey = key.toLowerCase();
      const normalizedValue = Array.isArray(value) ? value : [value];

      return {
        ...acc,
        [normalizedKey]: normalizedValue,
      };
    }, {});

    return normalizedHeaders;
  };

  /**
   * @returns HTTP method string for the request.
   */
  export const getMethodFromEvent = (
    /**
     * AWS Cloud Function event to read the method from.
     */
    event: IAWSCloudFunctionEvent,
  ) => {
    const { httpMethod = "" } = event;

    return httpMethod;
  };

  /**
   * @returns Normalized auth info with user id and roles.
   */
  export const getAuthInfo = (
    /**
     * AWS Cloud Function event to extract auth info from.
     */
    event: IAWSCloudFunctionEvent,
  ): AuthInfo => {
    const {
      requestContext: {
        authorizer: {
          claims: {
            sub: userId = undefined,
            "cognito:groups": roles = [],
          } = {},
        } = {},
      } = {},
    } = event;
    const cleanRoles = Array.isArray(roles)
      ? roles
      : typeof roles === "string"
        ? roles
            .split(",")
            .map((x) => x.trim())
            .filter((x) => !!x)
        : [];

    return {
      userId,
      roles: cleanRoles,
    };
  };

  /**
   * Parse out the Auth, CORS, Headers, Method and Body from an AWS Cloud Function event.
   * @returns Normalized event data for routing.
   * */
  export const normalizeCloudFunctionEvent: CloudFunctionEventTransformer = (
    /**
     * AWS Cloud Function event to normalize for routing.
     */
    event: IAWSCloudFunctionEvent,
  ): NormalizedCloudFunctionEventData => {
    const authInfo = getAuthInfo(event);
    const headers = getHeadersFromEvent(event);
    const method = getMethodFromEvent(event);
    const path = getPathFromEvent(event);
    const body = getBodyFromEvent(event);

    return {
      authInfo,
      headers,
      method,
      path,
      body,
    };
  };
}
