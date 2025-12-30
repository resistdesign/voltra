/**
 * Trace function signature for client logging.
 */
export type Trace = (...content: any[]) => void;

/**
 * Logger interface for S3 client config.
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
 * Endpoint definition for S3 client config.
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
 * Auth scheme properties wrapper.
 */
export type Properties = {
  /**
   * Auth scheme identifiers.
   */
  authSchemes?: string;
};

/**
 * Retry strategy wrapper for S3 client config.
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
 * Credentials configuration for S3 client.
 */
export type Credentials = {
  /**
   * Access key id.
   */
  accessKeyId: string;
  /**
   * Secret access key.
   */
  secretAccessKey: string;
  /**
   * Optional session token.
   */
  sessionToken?: string;
  /**
   * Optional credential scope.
   */
  credentialScope?: string;
  /**
   * Optional expiration timestamp string.
   */
  expiration?: string;
};

/**
 * Signer interface wrapper for S3 client.
 */
export type Signer = {
  /**
   * Sign function implementation.
   */
  sign: any;
};

/**
 * S3 client configuration subset for generated docs.
 */
export type AbridgedS3ClientConfig = {
  /**
   * Custom request handler override.
   */
  requestHandler?: string;
  /**
   * API version override for the S3 client.
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
   * AWS region identifier.
   */
  region?: string;
  /**
   * Credential provider override.
   */
  credentialDefaultProvider?: string;
  /**
   * Signing path escape toggle.
   */
  signingEscapePath?: string | false | true;
  /**
   * Use ARN region in requests.
   */
  useArnRegion?: string | false | true;
  /**
   * Default user agent provider override.
   */
  defaultUserAgentProvider?: string;
  /**
   * Stream hasher override.
   */
  streamHasher?: string;
  /**
   * MD5 implementation override.
   */
  md5?: string;
  /**
   * SHA1 implementation override.
   */
  sha1?: string;
  /**
   * AWS chunked encoding stream override.
   */
  getAwsChunkedEncodingStream?: string;
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
  eventStreamSerdeProvider?: string;
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
   * SDK stream mixin override.
   */
  sdkStreamMixin?: string;
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
   * Credentials override.
   */
  credentials?: string | Credentials;
  /**
   * Signer override.
   */
  signer?: string | Signer;
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
   * Force path-style addressing.
   */
  forcePathStyle?: string | false | true;
  /**
   * Use accelerate endpoint.
   */
  useAccelerateEndpoint?: string | false | true;
  /**
   * Disable multiregion access points.
   */
  disableMultiregionAccessPoints?: string | false | true;
  /**
   * Follow region redirects.
   */
  followRegionRedirects?: string | false | true;
  /**
   * S3 Express identity provider override.
   */
  s3ExpressIdentityProvider?: string;
  /**
   * Custom user agent string.
   */
  customUserAgent?: string;
  /**
   * Use global endpoint.
   */
  useGlobalEndpoint?: string | false | true;
  /**
   * Disable S3 Express session auth.
   */
  disableS3ExpressSessionAuth?: string | false | true;
};

export type S3SpecificConfig = {
  /**
   * S3 client configuration overrides.
   */
  s3Config?: AbridgedS3ClientConfig;
  /**
   * S3 bucket name for file storage.
   */
  bucketName: string;
  /**
   * Optional URL expiration time in seconds.
   */
  urlExpirationInSeconds?: number;
};
