export type CORSPatter = string | RegExp;

export type AuthInfo = {
  userId?: string;
  roles?: string[];
};

export type NormalizedCloudFunctionEventData = {
  authInfo: AuthInfo;
  headers: Record<string, string[]>;
  method: string;
  path: string;
  body: any;
};

export type CloudFunctionResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export type RouteHandler = (...args: any[]) => any | Promise<any>;

export type RouteHandlerFactory = (eventData: NormalizedCloudFunctionEventData) => RouteHandler;

export type RouteAuthConfig = {
  public?: boolean;
  anyAuthorized?: boolean;
  allowedRoles?: string[];
};

export type Route = {
  path: string;
  authConfig?: RouteAuthConfig;
} & (
  | {
      handlerFactory: RouteHandlerFactory;
      handler?: never;
    }
  | {
      handlerFactory?: never;
      handler: RouteHandler;
    }
);

export type RouteMap = Record<string, Route>;

export type CloudFunctionEventTransformer = (event: any) => NormalizedCloudFunctionEventData;

export type CloudFunctionEventRouter = (
  event: any,
  eventTransformer: CloudFunctionEventTransformer,
  routeMap: RouteMap,
  allowedOrigins: CORSPatter[]
) => Promise<CloudFunctionResponse>;
