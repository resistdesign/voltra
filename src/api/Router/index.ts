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
import { logFunctionCall } from "../../common/Logging/Utils";

export * from "./AWS";

/**
 * A utility function to add a route to a route map by path.
 * */
export const addRouteToRouteMap = (
  routeMap: RouteMap,
  route: Route,
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
 * */
export const addRoutesToRouteMap = (
  routeMap: RouteMap,
  routes: Route[],
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
 * */
export const addRouteMapToRouteMap = (
  routeMap: RouteMap,
  routeMapToAdd: RouteMap,
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
 * */
export const handleCloudFunctionEvent: CloudFunctionEventRouter = async (
  event: any,
  eventTransformer: CloudFunctionEventTransformer,
  routeMap: RouteMap,
  allowedOrigins: CORSPatter[],
  errorShouldBeExposedToClient?: (error: unknown) => boolean,
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
