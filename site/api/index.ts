import {
  addRoutesToRouteMap,
  AWS,
  handleCloudFunctionEvent,
} from "../../src/api/Router";
import { CloudFunctionResponse, RouteMap } from "../../src/api/Router/Types";
import normalizeCloudFunctionEvent = AWS.normalizeCloudFunctionEvent;

const ROUTE_MAP: RouteMap = addRoutesToRouteMap({}, [
  {
    path: "/hello",
    handler: async () => {
      return "Hello, world!";
    },
    authConfig: {
      public: true,
    },
  },
]);

console.log(ROUTE_MAP);

export const handler = async (event: any): Promise<CloudFunctionResponse> =>
  handleCloudFunctionEvent(event, normalizeCloudFunctionEvent, ROUTE_MAP, [
    process.env.CLIENT_ORIGIN as string,
  ]);
