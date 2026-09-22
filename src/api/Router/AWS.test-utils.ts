import { generateKeyPairSync, sign } from "node:crypto";
import { AWS } from "./AWS";

const USER_POOL_ID = "us-east-1_TESTPOOL";
const CLIENT_ID = "test-client";
const KEY_ID = "test-key";
const ISSUER = `https://cognito-idp.us-east-1.amazonaws.com/${USER_POOL_ID}`;
const primaryKeyPair = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const alternateKeyPair = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const publicJwk = primaryKeyPair.publicKey.export({
  format: "jwk",
}) as Record<string, unknown>;

const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = "";

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const encodeJsonBase64Url = (value: unknown): string =>
  encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));

const createToken = (
  tokenUse: "id" | "access",
  privateKey = primaryKeyPair.privateKey,
  payloadOverrides: Record<string, unknown> = {},
) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    kid: KEY_ID,
    typ: "JWT",
  };
  const payload = {
    sub: "user-123",
    "cognito:groups": ["member", "admin"],
    iss: ISSUER,
    token_use: tokenUse,
    exp: nowSeconds + 3600,
    iat: nowSeconds,
    ...(tokenUse === "id"
      ? { aud: CLIENT_ID }
      : { client_id: CLIENT_ID }),
    ...payloadOverrides,
  };
  const encodedHeader = encodeJsonBase64Url(header);
  const encodedPayload = encodeJsonBase64Url(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signatureBytes = sign(
    "RSA-SHA256",
    new TextEncoder().encode(signingInput),
    privateKey,
  ) as unknown as Uint8Array;
  const signature = encodeBase64Url(signatureBytes);

  return `${signingInput}.${signature}`;
};

const withMockedJwks = async <T>(callback: () => Promise<T>): Promise<T> => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        keys: [
          {
            ...publicJwk,
            kid: KEY_ID,
            alg: "RS256",
            use: "sig",
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )) as typeof fetch;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const getEvent = (token?: string): AWS.IAWSCloudFunctionEvent => ({
  headers: token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {},
});

export const runCognitoAuthInfoVerifiedIdTokenScenario = async () =>
  withMockedJwks(() =>
    AWS.getCognitoAuthInfo(getEvent(createToken("id")), {
      userPoolId: USER_POOL_ID,
      clientId: CLIENT_ID,
      tokenUse: "id",
    }),
  );

export const runCognitoAuthInfoVerifiedAccessTokenScenario = async () =>
  withMockedJwks(() =>
    AWS.getCognitoAuthInfo(getEvent(createToken("access")), {
      userPoolId: USER_POOL_ID,
      clientId: CLIENT_ID,
      tokenUse: "access",
    }),
  );

export const runCognitoAuthInfoInvalidSignatureScenario = async () =>
  withMockedJwks(() =>
    AWS.getCognitoAuthInfo(
      getEvent(createToken("id", alternateKeyPair.privateKey)),
      {
        userPoolId: USER_POOL_ID,
        clientId: CLIENT_ID,
        tokenUse: "id",
      },
    ),
  );

export const runCognitoAuthInfoWrongClientScenario = async () =>
  withMockedJwks(() =>
    AWS.getCognitoAuthInfo(
      getEvent(
        createToken("id", primaryKeyPair.privateKey, {
          aud: "wrong-client",
        }),
      ),
      {
        userPoolId: USER_POOL_ID,
        clientId: CLIENT_ID,
        tokenUse: "id",
      },
    ),
  );

export const runCognitoAuthInfoExpiredTokenScenario = async () =>
  withMockedJwks(() =>
    AWS.getCognitoAuthInfo(
      getEvent(
        createToken("id", primaryKeyPair.privateKey, {
          exp: Math.floor(Date.now() / 1000) - 60,
        }),
      ),
      {
        userPoolId: USER_POOL_ID,
        clientId: CLIENT_ID,
        tokenUse: "id",
      },
    ),
  );

export const runCognitoAuthInfoMissingTokenScenario = async () =>
  AWS.getCognitoAuthInfo(getEvent(), {
    userPoolId: USER_POOL_ID,
    clientId: CLIENT_ID,
    tokenUse: "id",
  });
