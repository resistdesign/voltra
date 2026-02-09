import {
  addRoutesToRouteMap,
  handleCloudFunctionEvent,
  type RouteMap,
} from "@resistdesign/voltra/api";

export const routeMapExample: RouteMap = addRoutesToRouteMap({}, []);
export const routerExample = handleCloudFunctionEvent;
