import { RouteMap } from './utils/Router/Types';
import { addRouteMapToRouteMap } from './utils/Router';
import { UserRoutes } from './AppRoutes/UserRoutes';

export const AppRouteMap: RouteMap = addRouteMapToRouteMap({}, UserRoutes, '/user');
