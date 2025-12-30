import { AuthInfo, RouteAuthConfig } from './Types';

/**
 * Resolve authorization for a request using auth info and route config.
 * @returns True when the request is authorized.
 * */
export const getRouteIsAuthorized = (
  /**
   * Auth info resolved for the incoming request.
   */
  authInfo: AuthInfo,
  /**
   * Route-level auth requirements for the request.
   */
  authConfig: RouteAuthConfig,
): boolean => {
  const { userId, roles = [] } = authInfo;
  const { public: routeIsPublic = false, anyAuthorized, allowedRoles = [] } = authConfig;

  return routeIsPublic || (anyAuthorized && !!userId) || !!allowedRoles.find((role) => roles.includes(role));
};
