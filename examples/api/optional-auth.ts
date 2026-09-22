import {
  AWS,
  addRoutesToRouteMap,
  handleCloudFunctionEvent,
  type RouteMap,
} from "@resistdesign/voltra/api";

const routes: RouteMap = addRoutesToRouteMap({}, [
  {
    path: "public-status",
    authConfig: { public: true },
    handlerFactory: (eventData) => () => ({
      signedIn: !!eventData.authInfo.userId,
    }),
  },
  {
    path: "account",
    authConfig: { anyAuthorized: true },
    handlerFactory: (eventData) => () => ({
      userId: eventData.authInfo.userId,
    }),
  },
]);

const getAuthInfo = (event: AWS.IAWSCloudFunctionEvent) =>
  AWS.getCognitoAuthInfo(event, {
    userPoolId: process.env.USER_POOL_ID as string,
    clientId: process.env.USER_POOL_CLIENT_ID as string,
  });

/**
 * Optional-auth routing example.
 *
 * Missing or invalid bearer credentials resolve as anonymous. Public routes
 * still run, while protected routes continue to return Unauthorized.
 */
export const handler = (event: AWS.IAWSCloudFunctionEvent) =>
  handleCloudFunctionEvent(
    event,
    AWS.normalizeCloudFunctionEvent,
    routes,
    ["https://example.com"],
    undefined,
    false,
    getAuthInfo,
  );
