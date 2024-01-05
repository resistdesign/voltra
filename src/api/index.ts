import { CloudFunctionResponse } from './utils/Router/Types';
import { handleCloudFunctionEvent } from './utils/Router';
import { normalizeCloudFunctionEvent } from './utils/Router/AWS';
import { AppRouteMap } from './AppRoutes';

export const handler = async (event: any): Promise<CloudFunctionResponse> =>
  handleCloudFunctionEvent(event, normalizeCloudFunctionEvent, AppRouteMap, [
    process.env.CLIENT_ORIGIN as string,
    /https:\/\/app-local\.lahc\.resist\.design(:.*?$|\/.*$|$)/gim,
  ]);
