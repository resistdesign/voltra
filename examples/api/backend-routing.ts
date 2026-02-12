import {
  addRoutesToRouteMap,
  handleCloudFunctionEvent,
  type RouteMap,
} from "@resistdesign/voltra/api";

/**
 * Backend/API request-routing reference example.
 *
 * This is unrelated to app/client Route component matching.
 */
export const backendRouteMapExample: RouteMap = addRoutesToRouteMap({}, []);
export const backendEventRouterExample = handleCloudFunctionEvent;
