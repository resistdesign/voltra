import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { CognitoJwtVerifierSingleUserPool } from "aws-jwt-verify/cognito-verifier";
import {
  AuthInfo,
  CloudFunctionEventTransformer,
  NormalizedCloudFunctionEventData,
} from "./Types";

const getBearerToken = (authorizationHeader: string): string | undefined => {
  const match = /^\s*Bearer\s+(.+?)\s*$/i.exec(authorizationHeader);

  return match?.[1];
};

const getStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => !!item);
  }

  return [];
};

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
   * Configuration for resolving Cognito user-pool authentication directly from
   * a bearer token on the incoming request.
   */
  export type CognitoAuthInfoConfig = {
    /**
     * Cognito user pool id that must have issued the token.
     */
    userPoolId: string;
    /**
     * Cognito app client id, or accepted app client ids, for the token.
     */
    clientId: string | string[];
    /**
     * Cognito token type that is accepted by this resolver.
     */
    tokenUse: "id" | "access";
  };


  type CognitoAuthInfoVerifier =
    CognitoJwtVerifierSingleUserPool<CognitoAuthInfoConfig>;

  const cognitoAuthInfoVerifierMap = new Map<string, CognitoAuthInfoVerifier>();

  const getCognitoAuthInfoVerifier = (
    config: CognitoAuthInfoConfig,
  ): CognitoAuthInfoVerifier => {
    const { userPoolId, clientId, tokenUse } = config;
    const clientIds = Array.isArray(clientId)
      ? [...clientId].sort()
      : [clientId];
    const key = JSON.stringify([userPoolId, tokenUse, ...clientIds]);
    let verifier = cognitoAuthInfoVerifierMap.get(key);

    if (!verifier) {
      verifier = CognitoJwtVerifier.create({
        userPoolId,
        clientId,
        tokenUse,
      });
      cognitoAuthInfoVerifierMap.set(key, verifier);
    }

    return verifier;
  };

  /**
   * Validate a Cognito bearer token from the raw cloud function event and
   * normalize its subject and groups into Voltra auth info.
   *
   * Token signature, issuer, expiration/not-before claims, token use, and app
   * client are verified by AWS's `aws-jwt-verify` Cognito verifier. The
   * verifier also discovers, fetches, caches, and refreshes the Cognito signing
   * keys for the configured user pool.
   *
   * Missing, malformed, expired, incorrectly scoped, or unverifiable tokens
   * resolve to anonymous auth info instead of throwing. This allows
   * `handleCloudFunctionEvent` to continue routing public requests while its
   * route authorization still denies protected routes without valid auth.
   *
   * @returns Auth info for a verified Cognito token, or an empty object when
   * authentication cannot be established.
   */
  export const getCognitoAuthInfo = async (
    /**
     * AWS Cloud Function event containing the bearer token.
     */
    event: IAWSCloudFunctionEvent,
    /**
     * Cognito validation configuration.
     */
    config: CognitoAuthInfoConfig,
  ): Promise<AuthInfo> => {
    try {
      const authorizationHeader = getHeadersFromEvent(event).authorization?.[0];
      const token = authorizationHeader
        ? getBearerToken(authorizationHeader)
        : undefined;

      if (!token) {
        return {};
      }

      const verifier = getCognitoAuthInfoVerifier(config);
      const payload = await verifier.verify(token);
      const userId = payload.sub;

      if (typeof userId !== "string" || !userId) {
        return {};
      }

      return {
        userId,
        roles: getStringArray(payload["cognito:groups"]),
      };
    } catch (error) {
      return {};
    }
  };

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
   * Extract auth info already populated on the event by an upstream authorizer.
   *
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
