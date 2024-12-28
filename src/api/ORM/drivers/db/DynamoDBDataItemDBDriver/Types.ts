export type Trace = (...content: any[]) => void;

export type Logger = {
  trace?: string | Trace;
  debug: Trace;
  info: Trace;
  warn: Trace;
  error: Trace;
};

export type Endpoint = {
  protocol: string;
  hostname: string;
  port?: string;
  path: string;
  query?: string;
};

export type RetryStrategy = {
  mode?: string;
  retry: any;
};

export type DynamoDBSpecificConfig = {
  requestHandler?: string;
  apiVersion?: string;
  sha256?: string;
  urlParser?: string;
  bodyLengthChecker?: string;
  streamCollector?: string;
  base64Decoder?: string;
  base64Encoder?: string;
  utf8Decoder?: string;
  utf8Encoder?: string;
  runtime?: string;
  disableHostPrefix?: string | false | true;
  serviceId?: string;
  useDualstackEndpoint?: string | false | true;
  useFipsEndpoint?: string | false | true;
  defaultUserAgentProvider?: string;
  region?: string;
  credentialDefaultProvider?: string;
  maxAttempts?: string;
  retryMode?: string;
  logger?: string | Logger;
  extensions?: string;
  defaultsMode?:
    | string
    | "standard"
    | "in-region"
    | "cross-region"
    | "mobile"
    | "auto"
    | "legacy";
  endpointDiscoveryEnabledProvider?: string;
  endpoint?: string | Endpoint;
  endpointProvider?: string;
  tls?: string | false | true;
  retryStrategy?: string | RetryStrategy;
  customUserAgent?: string;
  httpAuthSchemes?: string;
  httpAuthSchemeProvider?: string;
  credentials?: string;
  signer?: string;
  signingEscapePath?: string | false | true;
  systemClockOffset?: string;
  signingRegion?: string;
  signerConstructor?: string;
  endpointCacheSize?: string;
  endpointDiscoveryEnabled?: string | false | true;
};
