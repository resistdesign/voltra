import { createPublicKey, verify as verifySignature } from "node:crypto";
import {
  AuthInfo,
  CloudFunctionEventTransformer,
  NormalizedCloudFunctionEventData,
} from "./Types";

type CognitoJwk = {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
};

type CognitoJwksCacheEntry = {
  expiresAt: number;
  keys: CognitoJwk[];
};

const COGNITO_JWKS_CACHE_TTL_MS = 60 * 60 * 1000;
const cognitoJwksCache = new Map<string, CognitoJwksCacheEntry>();

const decodeBase64UrlBytes = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (base64.length % 4)) % 4;
  const decoded = atob(`${base64}${"=".repeat(paddingLength)}`);
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return bytes;
};

const decodeBase64UrlJson = <T>(value: string): T | undefined => {
  try {
    return JSON.parse(
      new TextDecoder().decode(decodeBase64UrlBytes(value)),
    ) as T;
  } catch (error) {
    return undefined;
  }
};

const getCognitoRegion = (userPoolId: string): string | undefined => {
  const separatorIndex = userPoolId.indexOf("_");

  return separatorIndex > 0 ? userPoolId.slice(0, separatorIndex) : undefined;
};

const getBearerToken = (authorizationHeader: string): string | undefined => {
  const match = /^\s*Bearer\s+(.+?)\s*$/i.exec(authorizationHeader);

  return match?.[1];
};

const getCognitoJwks = async (
  issuer: string,
  forceRefresh: boolean = false,
): Promise<CognitoJwk[]> => {
  const cached = cognitoJwksCache.get(issuer);

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const response = await fetch(`${issuer}/.well-known/jwks.json`);

  if (!response.ok) {
    throw new Error("Unable to load Cognito signing keys.");
  }

  const data = (await response.json()) as { keys?: CognitoJwk[] };
  const keys = Array.isArray(data.keys) ? data.keys : [];

  if (keys.length === 0) {
    throw new Error("Cognito signing keys were empty.");
  }

  cognitoJwksCache.set(issuer, {
    expiresAt: Date.now() + COGNITO_JWKS_CACHE_TTL_MS,
    keys,
  });

  return keys;
};

const getCognitoJwk = async (
  issuer: string,
  kid: string,
): Promise<CognitoJwk | undefined> => {
  let keys = await getCognitoJwks(issuer);
  let key = keys.find((item) => item.kid === kid);

  if (!key) {
    keys = await getCognitoJwks(issuer, true);
    key = keys.find((item) => item.kid === kid);
  }

  return key;
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

  /**
   * Validate a Cognito bearer token from the raw cloud function event and
   * normalize its subject and groups into Voltra auth info.
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
      const { userPoolId, clientId, tokenUse } = config;
      const region = getCognitoRegion(userPoolId);
      const authorizationHeader = getHeadersFromEvent(event).authorization?.[0];
      const token = authorizationHeader
        ? getBearerToken(authorizationHeader)
        : undefined;

      if (!region || !token) {
        return {};
      }

      const tokenParts = token.split(".");

      if (tokenParts.length !== 3) {
        return {};
      }

      const [encodedHeader, encodedPayload, encodedSignature] = tokenParts;
      const header = decodeBase64UrlJson<{
        alg?: string;
        kid?: string;
      }>(encodedHeader);
      const payload = decodeBase64UrlJson<Record<string, unknown>>(
        encodedPayload,
      );

      if (
        !header ||
        !payload ||
        header.alg !== "RS256" ||
        typeof header.kid !== "string"
      ) {
        return {};
      }

      const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
      const jwk = await getCognitoJwk(issuer, header.kid);

      if (
        !jwk ||
        (jwk.alg !== undefined && jwk.alg !== "RS256") ||
        (jwk.use !== undefined && jwk.use !== "sig")
      ) {
        return {};
      }

      const publicKey = createPublicKey({
        key: jwk as any,
        format: "jwk",
      });
      const signatureIsValid = verifySignature(
        "RSA-SHA256",
        new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
        publicKey,
        decodeBase64UrlBytes(encodedSignature),
      );

      if (!signatureIsValid) {
        return {};
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresAt = payload.exp;
      const notBefore = payload.nbf;

      if (
        payload.iss !== issuer ||
        payload.token_use !== tokenUse ||
        typeof expiresAt !== "number" ||
        expiresAt <= nowSeconds ||
        (typeof notBefore === "number" && notBefore > nowSeconds)
      ) {
        return {};
      }

      const acceptedClientIds = Array.isArray(clientId)
        ? clientId
        : [clientId];
      const tokenClientId =
        tokenUse === "id" ? payload.aud : payload.client_id;

      if (
        typeof tokenClientId !== "string" ||
        !acceptedClientIds.includes(tokenClientId)
      ) {
        return {};
      }

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
