import { CognitoJwtVerifier } from "aws-jwt-verify";
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
   * Configuration for resolving Cognito authentication directly from a bearer token.
   */
  export type CognitoAuthInfoConfig = {
    /**
     * Cognito User Pool id that issued the token.
     */
    userPoolId: string;
    /**
     * Cognito app client id, or accepted app client ids, for token validation.
     */
    clientId: string | string[];
    /**
     * Cognito token type to accept.
     *
     * @defaultValue "access"
     */
    tokenUse?: "access" | "id";
  };

  const cognitoVerifierMap = new Map<
    string,
    ReturnType<typeof CognitoJwtVerifier.create>
  >();

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

  const getCleanRoles = (roles: unknown): string[] =>
    Array.isArray(roles)
      ? roles.filter((role): role is string => typeof role === "string")
      : typeof roles === "string"
        ? roles
            .split(",")
            .map((x) => x.trim())
            .filter((x) => !!x)
        : [];

  /**
   * Resolve Cognito auth information from an Authorization bearer token.
   *
   * Missing, malformed, expired, or otherwise invalid credentials resolve to
   * empty auth information instead of rejecting the request. This allows Voltra
   * public routes to remain reachable while protected routes still reject the
   * request through their route auth configuration.
   *
   * @returns Verified user id and Cognito groups, or empty auth information.
   */
  export const getCognitoAuthInfo = async (
    /**
     * AWS Cloud Function event containing the incoming Authorization header.
     */
    event: IAWSCloudFunctionEvent,
    /**
     * Cognito token verification configuration.
     */
    config: CognitoAuthInfoConfig,
  ): Promise<AuthInfo> => {
    const { userPoolId, clientId, tokenUse = "access" } = config;
    const headers = getHeadersFromEvent(event);
    const authorization = headers.authorization?.[0] ?? "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return {
        userId: undefined,
        roles: [],
      };
    }

    const verifierKey = JSON.stringify({
      userPoolId,
      clientId,
      tokenUse,
    });
    let verifier = cognitoVerifierMap.get(verifierKey);

    if (!verifier) {
      verifier = CognitoJwtVerifier.create({
        userPoolId,
        clientId,
        tokenUse,
      });
      cognitoVerifierMap.set(verifierKey, verifier);
    }

    try {
      const payload = await verifier.verify(match[1]);

      return {
        userId: typeof payload.sub === "string" ? payload.sub : undefined,
        roles: getCleanRoles(payload["cognito:groups"]),
      };
    } catch (error) {
      return {
        userId: undefined,
        roles: [],
      };
    }
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
    const cleanRoles = getCleanRoles(roles);

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
