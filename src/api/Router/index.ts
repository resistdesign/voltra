/**
 * @packageDocumentation
 *
 * Minimal Cloud Function routing helpers. Compose a {@link RouteMap}, wire in
 * auth via {@link getRouteIsAuthorized}, apply CORS helpers, and dispatch with
 * {@link handleCloudFunctionEvent}. AWS event normalization is available under
 * {@link AWS}.
 *
 * Example wiring:
 * ```ts
 * import { AWS, addRoutesToRouteMap, handleCloudFunctionEvent } from "./Router";
 * import type { RouteMap } from "./Router/Types";
 *
 * const routes: RouteMap = addRoutesToRouteMap({}, [
 *   { path: "status", authConfig: { public: true }, handler: () => "ok" },
 * ]);
 *
 * export const handler = (event: unknown) =>
 *   handleCloudFunctionEvent(
 *     event,
 *     AWS.normalizeCloudFunctionEvent,
 *     routes,
 *     ["https://example.com"],
 *   );
 * ```
 */
import {
  CloudFunctionEventRouter,
  CloudFunctionEventTransformer,
  CloudFunctionResponse,
  CORSPatter,
  NormalizedCloudFunctionEventData,
  Route,
  RouteHandler,
  RouteMap,
} from "./Types";
import { getRouteIsAuthorized } from "./Auth";
import { getHeadersWithCORS } from "./CORS";
import {
  getPathArray,
  getPathString,
  mergeStringPaths,
} from "../../common/Routing";
import { logFunctionCall } from "../../common/Logging";

export * from "./Types";
export * from "./AWS";

/**
 * A utility function to add a route to a route map by path.
 * @returns New route map with the route appended.
 * */
export const addRouteToRouteMap = (
  /**
   * Existing route map to append to.
   */
  routeMap: RouteMap,
  /**
   * Route definition to add to the map.
   */
  route: Route,
  /**
   * Optional base path prefix to apply to the route path.
   */
  basePath: string = "",
): RouteMap => {
  const { path: routePath } = route;
  const path = mergeStringPaths(basePath, routePath);

  return {
    ...routeMap,
    [path]: route,
  };
};

/**
 * Add multiple routes to a {@link RouteMap} by path.
 * @returns New route map with all routes appended.
 * */
export const addRoutesToRouteMap = (
  /**
   * Existing route map to append to.
   */
  routeMap: RouteMap,
  /**
   * Route list to add to the map.
   */
  routes: Route[],
  /**
   * Optional base path prefix applied to all route paths.
   */
  basePath: string = "",
): RouteMap => {
  let newRouteMap = {
    ...routeMap,
  };

  for (const route of routes) {
    newRouteMap = addRouteToRouteMap(newRouteMap, route, basePath);
  }

  return newRouteMap;
};

/**
 * Apply one {@link RouteMap} to another.
 * @returns New route map with the incoming routes merged.
 * */
export const addRouteMapToRouteMap = (
  /**
   * Existing route map to append to.
   */
  routeMap: RouteMap,
  /**
   * Route map to merge into the existing map.
   */
  routeMapToAdd: RouteMap,
  /**
   * Optional base path prefix applied to all incoming paths.
   */
  basePath: string = "",
): RouteMap => {
  const newRouteMap = {
    ...routeMap,
  };

  for (const k in routeMapToAdd) {
    const path = mergeStringPaths(basePath, k);

    newRouteMap[path] = routeMapToAdd[k];
  }

  return newRouteMap;
};

/**
 * A Cloud Function event router.
 * @returns Cloud function response for the routed request.
 * */
export const handleCloudFunctionEvent: CloudFunctionEventRouter = async (
  /**
   * Raw Cloud Function event object.
   */
  event: any,
  /**
   * Transformer used to normalize the event.
   */
  eventTransformer: CloudFunctionEventTransformer,
  /**
   * Route lookup map keyed by normalized path.
   */
  routeMap: RouteMap,
  /**
   * Allowed origins list used to build CORS headers.
   */
  allowedOrigins: CORSPatter[],
  /**
   * Optional predicate to decide whether error details are exposed.
   */
  errorShouldBeExposedToClient?: (error: unknown) => boolean,
  /**
   * When true, log handler inputs and outputs.
   */
  debug: boolean = false,
): Promise<CloudFunctionResponse> => {
  let transformedEvent: NormalizedCloudFunctionEventData | undefined =
    undefined;

  try {
    transformedEvent = eventTransformer(event);
  } catch (error) {
    // Ignore.
  }

  if (transformedEvent) {
    const {
      authInfo,
      headers: { origin: originItems = [] } = {},
      path = "",
      // IMPORTANT: Respond automatically to all OPTIONS requests.
      method,
      // IMPORTANT: Should be an array of arguments.
      body = [],
    } = transformedEvent;
    const providedOrigin = originItems[0];
    const normalizedOrigin =
      typeof providedOrigin === "string" ? providedOrigin : "";
    const normalizedBody = Array.isArray(body) ? body : [body];
    const normalizedPath = getPathString(getPathArray(`${path}`));
    const route = routeMap[normalizedPath];
    const responseHeaders = getHeadersWithCORS(
      normalizedOrigin,
      allowedOrigins,
    );

    if (method === "OPTIONS") {
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: "OK",
      };
    } else {
      if (route) {
        const { authConfig = {}, handlerFactory, handler } = route;
        const requestIsAuthorized = getRouteIsAuthorized(authInfo, authConfig);

        if (requestIsAuthorized) {
          const handlerInstance: RouteHandler = handler
            ? handler
            : handlerFactory(transformedEvent);

          try {
            const result = await logFunctionCall(
              normalizedPath,
              normalizedBody,
              handlerInstance,
              debug,
            );

            return {
              statusCode: 200,
              headers: responseHeaders,
              body: JSON.stringify(result),
            };
          } catch (error: any) {
            return {
              statusCode: 500,
              headers: responseHeaders,
              body: JSON.stringify(
                {
                  status: "Internal Server Error",
                  message: error?.message,
                  error: errorShouldBeExposedToClient
                    ? errorShouldBeExposedToClient(error)
                      ? error
                      : undefined
                    : undefined,
                },
                null,
                2,
              ),
            };
          }
        } else {
          return {
            statusCode: 401,
            headers: responseHeaders,
            body: "Unauthorized",
          };
        }
      }

      return {
        statusCode: 404,
        headers: responseHeaders,
        body: "Not Found",
      };
    }
  }

  return {
    statusCode: 500,
    headers: {},
    body: "Internal Server Error",
  };
};
