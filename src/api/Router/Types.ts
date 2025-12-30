/**
 * A pattern for a CORS origin.
 * */
export type CORSPatter = string | RegExp;

/**
 * User authentication information.
 * Typically, from Cognito.
 * */
export type AuthInfo = {
  /**
   * Unique user identifier from the auth provider.
   */
  userId?: string;
  /**
   * Role or group names assigned to the user.
   */
  roles?: string[];
};

/**
 * The normalized event data that is passed to the route handler.
 * */
export type NormalizedCloudFunctionEventData = {
  /**
   * Auth info resolved from the incoming event.
   */
  authInfo: AuthInfo;
  /**
   * Normalized headers keyed by lowercase header name.
   */
  headers: Record<string, string[]>;
  /**
   * HTTP method (e.g. GET, POST).
   */
  method: string;
  /**
   * Request path string.
   */
  path: string;
  /**
   * Parsed body payload passed to handlers.
   */
  body: any;
};

/**
 * The response information that sent back to the requester.
 * */
export type CloudFunctionResponse = {
  /**
   * HTTP status code to return.
   */
  statusCode: number;
  /**
   * Headers to include in the response.
   */
  headers: Record<string, string>;
  /**
   * Serialized response payload.
   */
  body: string;
};

/**
 * A function that handles an RPC request to a route.
 * @param args Handler arguments derived from the normalized event body.
 * @returns Handler result or a promise of the result.
 */
export type RouteHandler = (...args: any[]) => any | Promise<any>;

/**
 * A factory for creating a route handler with context injected.
 * @param eventData Normalized event data used to build the handler.
 * @returns Route handler with context applied.
 */
export type RouteHandlerFactory = (
  eventData: NormalizedCloudFunctionEventData,
) => RouteHandler;

/**
 * A configuration to specify the authentication required to access a route.
 * */
export type RouteAuthConfig = {
  /**
   * When true, the route is publicly accessible without auth.
   */
  public?: boolean;
  /**
   * When true, any authenticated user is allowed.
   */
  anyAuthorized?: boolean;
  /**
   * Explicit list of role names permitted to access the route.
   */
  allowedRoles?: string[];
};

/**
 * A configuration used to define how an RPC request to a specific path is handled.
 * */
export type Route = {
  /**
   * Route path segment used as the lookup key in a RouteMap.
   */
  path: string;
  /**
   * Optional auth requirements for the route.
   */
  authConfig?: RouteAuthConfig;
} & (
  | {
      /**
       * Factory for building a handler with injected context.
       */
      handlerFactory: RouteHandlerFactory;
      handler?: never;
    }
  | {
      handlerFactory?: never;
      /**
       * Direct handler invoked with the normalized body payload.
       */
      handler: RouteHandler;
    }
);

/**
 * A collection of {@link Route} objects, indexed by their path.
 * */
export type RouteMap = Record<string, Route>;

/**
 * A function that transforms an event into a normalized event data object.
 * @param event Raw cloud function event object.
 * @returns Normalized event data for routing.
 */
export type CloudFunctionEventTransformer = (
  event: any,
) => NormalizedCloudFunctionEventData;

/**
 * A function that routes an event to a route handler based on a {@link RouteMap}.
 * @param event Raw cloud function event object.
 * @param eventTransformer Transformer used to normalize the event.
 * @param routeMap Route lookup map keyed by path.
 * @param allowedOrigins Allowed origins for CORS responses.
 * @param errorShouldBeExposedToClient Optional error filter for response payloads.
 * @param debug When true, log handler inputs and outputs.
 * @returns Cloud function response object.
 */
export type CloudFunctionEventRouter = (
  event: any,
  eventTransformer: CloudFunctionEventTransformer,
  routeMap: RouteMap,
  allowedOrigins: CORSPatter[],
  errorShouldBeExposedToClient?: (error: unknown) => boolean,
  debug?: boolean,
) => Promise<CloudFunctionResponse>;
