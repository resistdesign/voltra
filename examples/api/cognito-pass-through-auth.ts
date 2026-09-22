import {
  AWS,
  addRoutesToRouteMap,
  handleCloudFunctionEvent,
  type CloudFunctionResponse,
} from "@resistdesign/voltra/api";

const routes = addRoutesToRouteMap({}, [
  {
    path: "status",
    authConfig: { public: true },
    handlerFactory: (eventData) => () => ({
      status: "ok",
      userId: eventData.authInfo.userId,
    }),
  },
  {
    path: "account",
    authConfig: { anyAuthorized: true },
    handlerFactory: (eventData) => () => ({
      userId: eventData.authInfo.userId,
      roles: eventData.authInfo.roles,
    }),
  },
]);

const getAuthInfo = (event: AWS.IAWSCloudFunctionEvent) =>
  AWS.getCognitoAuthInfo(event, {
    userPoolId: process.env.USER_POOL_ID as string,
    clientId: process.env.USER_POOL_CLIENT_ID as string,
    tokenUse: "id",
  });

/**
 * Example of optional request authentication.
 *
 * A missing or invalid bearer token is normalized to anonymous auth info.
 * Public routes can still run, while protected routes are denied by their
 * normal Voltra route auth configuration.
 */
export const handler = (
  event: AWS.IAWSCloudFunctionEvent,
): Promise<CloudFunctionResponse> =>
  handleCloudFunctionEvent(
    event,
    AWS.normalizeCloudFunctionEvent,
    routes,
    [process.env.CLIENT_ORIGIN as string],
    undefined,
    false,
    getAuthInfo,
  );
