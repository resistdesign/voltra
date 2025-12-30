/**
 * Trace function signature for client logging.
 */
export type Trace = (...content: any[]) => void;

/**
 * Logger interface for DynamoDB client config.
 */
export type Logger = {
  /**
   * Optional trace output or trace level string.
   */
  trace?: string | Trace;
  /**
   * Debug logger.
   */
  debug: Trace;
  /**
   * Info logger.
   */
  info: Trace;
  /**
   * Warn logger.
   */
  warn: Trace;
  /**
   * Error logger.
   */
  error: Trace;
};

/**
 * Endpoint definition for DynamoDB client config.
 */
export type Endpoint = {
  /**
   * Protocol scheme (e.g., https).
   */
  protocol: string;
  /**
   * Hostname for the endpoint.
   */
  hostname: string;
  /**
   * Optional port override.
   */
  port?: string;
  /**
   * Path portion of the endpoint URL.
   */
  path: string;
  /**
   * Optional query string.
   */
  query?: string;
};

/**
 * Retry strategy wrapper for DynamoDB client config.
 */
export type RetryStrategy = {
  /**
   * Strategy mode identifier.
   */
  mode?: string;
  /**
   * Retry strategy implementation.
   */
  retry: any;
};

/**
 * DynamoDB client configuration subset for generated docs.
 */
export type DynamoDBSpecificConfig = {
  /**
   * Custom request handler override.
   */
  requestHandler?: string;
  /**
   * API version override for the DynamoDB client.
   */
  apiVersion?: string;
  /**
   * Hash implementation identifier.
   */
  sha256?: string;
  /**
   * URL parser override.
   */
  urlParser?: string;
  /**
   * Body length checker override.
   */
  bodyLengthChecker?: string;
  /**
   * Stream collector override.
   */
  streamCollector?: string;
  /**
   * Base64 decoder override.
   */
  base64Decoder?: string;
  /**
   * Base64 encoder override.
   */
  base64Encoder?: string;
  /**
   * UTF-8 decoder override.
   */
  utf8Decoder?: string;
  /**
   * UTF-8 encoder override.
   */
  utf8Encoder?: string;
  /**
   * Runtime identifier override.
   */
  runtime?: string;
  /**
   * Disable host prefix injection.
   */
  disableHostPrefix?: string | false | true;
  /**
   * Service id override.
   */
  serviceId?: string;
  /**
   * Enable dualstack endpoints.
   */
  useDualstackEndpoint?: string | false | true;
  /**
   * Enable FIPS endpoints.
   */
  useFipsEndpoint?: string | false | true;
  /**
   * Default user agent provider override.
   */
  defaultUserAgentProvider?: string;
  /**
   * AWS region identifier.
   */
  region?: string;
  /**
   * Credential provider override.
   */
  credentialDefaultProvider?: string;
  /**
   * Maximum retry attempts.
   */
  maxAttempts?: string;
  /**
   * Retry mode identifier.
   */
  retryMode?: string;
  /**
   * Logger configuration or identifier.
   */
  logger?: string | Logger;
  /**
   * Extensions applied to the client.
   */
  extensions?: string;
  /**
   * Defaults mode selector for AWS SDK config.
   * @allowCustomSelection
   */
  defaultsMode?:
    | "standard"
    | "in-region"
    | "cross-region"
    | "mobile"
    | "auto"
    | "legacy";
  /**
   * Endpoint discovery provider override.
   */
  endpointDiscoveryEnabledProvider?: string;
  /**
   * Explicit endpoint override.
   */
  endpoint?: string | Endpoint;
  /**
   * Endpoint provider override.
   */
  endpointProvider?: string;
  /**
   * TLS usage override.
   */
  tls?: string | false | true;
  /**
   * Retry strategy override.
   */
  retryStrategy?: string | RetryStrategy;
  /**
   * Custom user agent string.
   */
  customUserAgent?: string;
  /**
   * HTTP auth schemes override.
   */
  httpAuthSchemes?: string;
  /**
   * HTTP auth scheme provider override.
   */
  httpAuthSchemeProvider?: string;
  /**
   * Credentials override.
   */
  credentials?: string;
  /**
   * Signer override.
   */
  signer?: string;
  /**
   * Signing path escape toggle.
   */
  signingEscapePath?: string | false | true;
  /**
   * System clock offset override.
   */
  systemClockOffset?: string;
  /**
   * Signing region override.
   */
  signingRegion?: string;
  /**
   * Signer constructor override.
   */
  signerConstructor?: string;
  /**
   * Endpoint cache size override.
   */
  endpointCacheSize?: string;
  /**
   * Enable endpoint discovery.
   */
  endpointDiscoveryEnabled?: string | false | true;
};
