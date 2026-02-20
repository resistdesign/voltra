import {
  addRouteMapToRouteMap,
  addRouteToRouteMap,
  addRoutesToRouteMap,
  handleCloudFunctionEvent,
} from "./index";
import { AWS } from "./AWS";
import type { Route } from "./Types";
import { mergeStringPaths } from "../../common/Routing";

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
