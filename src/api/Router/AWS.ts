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
    requestContext?: Record<any, any>;
    httpMethod?: string;
    headers?: Record<string, string>;
    multiValueHeaders?: Record<string, string[]>;
    path?: string;
    body?: string;
  }

  export const getPathFromEvent = (event: IAWSCloudFunctionEvent) => {
    const { path = "" } = event;

    return path;
  };

  export const getBodyFromEvent = (event: IAWSCloudFunctionEvent): any => {
    const { body = "" } = event;

    try {
      const bodyValue: any = JSON.parse(body);

      return bodyValue;
    } catch (error) {
      return undefined;
    }
  };

  export const getHeadersFromEvent = (
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

  export const getMethodFromEvent = (event: IAWSCloudFunctionEvent) => {
    const { httpMethod = "" } = event;

    return httpMethod;
  };

  export const getAuthInfo = (event: IAWSCloudFunctionEvent): AuthInfo => {
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
   * */
  export const normalizeCloudFunctionEvent: CloudFunctionEventTransformer = (
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
