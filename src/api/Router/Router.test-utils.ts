import {
  addRouteMapToRouteMap,
  addRouteToRouteMap,
  addRoutesToRouteMap,
  handleCloudFunctionEvent,
} from "./index";
import { AWS } from "./AWS";
import type { Route } from "./Types";
import { mergeStringPaths } from "../../common/Routing";
import { isStandardHTTPResponse } from "./Utils";

const buildRoute = (path: string, payload: unknown): Route => ({
  path,
  authConfig: { public: true },
  handler: () => payload,
});

const runRouterScenario = async () => {
  let routeMap = {};

  routeMap = addRouteToRouteMap(routeMap, buildRoute("status", "ok"));
  routeMap = addRoutesToRouteMap(routeMap, [
    buildRoute("alpha", "a"),
    buildRoute("beta", "b"),
  ]);
  routeMap = addRouteMapToRouteMap(routeMap, {
    gamma: buildRoute("gamma", "g"),
  });

  const routeKeys = Object.keys(routeMap).sort();

  const event = {
    httpMethod: "POST",
    path: "status",
    body: JSON.stringify(["payload"]),
    headers: { Origin: "https://example.com" },
    multiValueHeaders: {},
    requestContext: {
      authorizer: {
        claims: { sub: "user-1", "cognito:groups": ["admin"] },
      },
    },
  };

  const normalized = AWS.normalizeCloudFunctionEvent(event);
  const handlerResponse = await handleCloudFunctionEvent(
    event,
    AWS.normalizeCloudFunctionEvent,
    routeMap,
    ["https://example.com"],
    undefined,
  );

  const optionsResponse = await handleCloudFunctionEvent(
    { ...event, httpMethod: "OPTIONS" },
    AWS.normalizeCloudFunctionEvent,
    routeMap,
    ["https://example.com"],
    undefined,
  );

  const notFoundResponse = await handleCloudFunctionEvent(
    { ...event, path: "missing" },
    AWS.normalizeCloudFunctionEvent,
    routeMap,
    ["https://example.com"],
    undefined,
  );

  const securedPath = mergeStringPaths("", "status");
  const unauthorizedRouteMap = {
    [securedPath]: {
      path: "status",
      authConfig: { anyAuthorized: true },
      handler: () => "secure",
    },
  };

  const unauthorizedResponse = await handleCloudFunctionEvent(
    { ...event, requestContext: {} },
    AWS.normalizeCloudFunctionEvent,
    unauthorizedRouteMap,
    ["https://example.com"],
    undefined,
  );

  const handlerErrorRouteMap = {
    [securedPath]: {
      path: "status",
      authConfig: { public: true },
      handler: () => {
        throw new Error("boom");
      },
    },
  };

  const errorResponse = await handleCloudFunctionEvent(
    event,
    AWS.normalizeCloudFunctionEvent,
    handlerErrorRouteMap,
    ["https://example.com"],
    () => true,
  );

  return {
    routeKeys,
    normalized,
    handlerResponse,
    optionsResponse,
    notFoundResponse,
    unauthorizedResponse,
    errorResponse,
  };
};

export const runRouterRouteKeysScenario = async () =>
  (await runRouterScenario()).routeKeys;

export const runRouterNormalizedScenario = async () =>
  (await runRouterScenario()).normalized;

export const runRouterHandlerResponseScenario = async () =>
  (await runRouterScenario()).handlerResponse;

export const runRouterOptionsResponseScenario = async () =>
  (await runRouterScenario()).optionsResponse;

export const runRouterNotFoundResponseScenario = async () =>
  (await runRouterScenario()).notFoundResponse;

export const runRouterUnauthorizedResponseScenario = async () =>
  (await runRouterScenario()).unauthorizedResponse;

export const runRouterErrorResponseScenario = async () =>
  (await runRouterScenario()).errorResponse;


export const runRouterStandardHTTPResponseDetectionScenario = () => ({
  standardResponse: isStandardHTTPResponse(
    new Response("ok", {
      status: 202,
    }),
  ),
  plainObject: isStandardHTTPResponse({
    status: 202,
    body: "ok",
  }),
});

export const runRouterAuthResolverScenario = async () => {
  const routeMap = addRoutesToRouteMap({}, [
    {
      path: "status",
      authConfig: { anyAuthorized: true },
      handlerFactory: (eventData: any) => () => eventData.authInfo,
    },
  ]);

  return handleCloudFunctionEvent(
    {
      httpMethod: "POST",
      path: "status",
      body: "[]",
      headers: {},
      multiValueHeaders: {},
      requestContext: {},
    },
    AWS.normalizeCloudFunctionEvent,
    routeMap,
    [],
    undefined,
    false,
    async () => ({
      userId: "resolved-user",
      roles: ["member"],
    }),
  );
};

export const runRouterOptionalAuthPublicScenario = async () =>
  handleCloudFunctionEvent(
    {
      httpMethod: "POST",
      path: "public",
      body: "[]",
      headers: {},
      multiValueHeaders: {},
      requestContext: {},
    },
    AWS.normalizeCloudFunctionEvent,
    addRoutesToRouteMap({}, [
      {
        path: "public",
        authConfig: { public: true },
        handler: () => "public",
      },
    ]),
    [],
    undefined,
    false,
    async () => ({}),
  );

export const runRouterOptionalAuthProtectedScenario = async () =>
  handleCloudFunctionEvent(
    {
      httpMethod: "POST",
      path: "protected",
      body: "[]",
      headers: {},
      multiValueHeaders: {},
      requestContext: {},
    },
    AWS.normalizeCloudFunctionEvent,
    addRoutesToRouteMap({}, [
      {
        path: "protected",
        authConfig: { anyAuthorized: true },
        handler: () => "protected",
      },
    ]),
    [],
    undefined,
    false,
    async () => ({}),
  );

const cognitoConfig: AWS.CognitoAuthInfoConfig = {
  userPoolId: "us-east-1_example",
  clientId: "example-client",
};

export const runCognitoAuthInfoNoTokenScenario = async () =>
  AWS.getCognitoAuthInfo(
    {
      headers: {},
    },
    cognitoConfig,
  );

export const runCognitoAuthInfoInvalidTokenScenario = async () =>
  AWS.getCognitoAuthInfo(
    {
      headers: {
        Authorization: "Bearer not-a-jwt",
      },
    },
    cognitoConfig,
  );
