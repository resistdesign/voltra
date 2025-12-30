import { AuthInfo, RouteAuthConfig } from './Types';

/**
 * Resolve authorization for a request using auth info and route config.
 * */
export const getRouteIsAuthorized = (authInfo: AuthInfo, authConfig: RouteAuthConfig): boolean => {
  const { userId, roles = [] } = authInfo;
  const { public: routeIsPublic = false, anyAuthorized, allowedRoles = [] } = authConfig;

  return routeIsPublic || (anyAuthorized && !!userId) || !!allowedRoles.find((role) => roles.includes(role));
};
