/**
 * A pattern for a CORS origin.
 * */
export type CORSPatter = string | RegExp;

/**
 * User authentication information.
 * Typically, from Cognito.
 * */
export type AuthInfo = {
  userId?: string;
  roles?: string[];
};

/**
 * The normalized event data that is passed to the route handler.
 * */
export type NormalizedCloudFunctionEventData = {
  authInfo: AuthInfo;
  headers: Record<string, string[]>;
  method: string;
  path: string;
  body: any;
};

/**
 * The response information that sent back to the requester.
 * */
export type CloudFunctionResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

/**
 * A function that handles an RPC request to a route.
 * */
export type RouteHandler = (...args: any[]) => any | Promise<any>;

/**
 * A factory for creating a route handler with context injected.
 * */
export type RouteHandlerFactory = (
  eventData: NormalizedCloudFunctionEventData,
) => RouteHandler;

/**
 * A configuration to specify the authentication required to access a route.
 * */
export type RouteAuthConfig = {
  public?: boolean;
  anyAuthorized?: boolean;
  allowedRoles?: string[];
};

/**
 * A configuration used to define how an RPC request to a specific path is handled.
 * */
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

/**
 * A collection of {@link Route} objects, indexed by their path.
 * */
export type RouteMap = Record<string, Route>;

/**
 * A function that transforms an event into a normalized event data object.
 * */
export type CloudFunctionEventTransformer = (
  event: any,
) => NormalizedCloudFunctionEventData;

/**
 * A function that routes an event to a route handler based on a {@link RouteMap}.
 * */
export type CloudFunctionEventRouter = (
  event: any,
  eventTransformer: CloudFunctionEventTransformer,
  routeMap: RouteMap,
  allowedOrigins: CORSPatter[],
) => Promise<CloudFunctionResponse>;
