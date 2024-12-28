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
  port?: string | string;
  path: string;
  query?: string | string;
};

export type RetryStrategy = {
  mode?: string | string;
  retry: any;
};

export type DynamoDBSpecificConfig = {
  requestHandler?: string;
  apiVersion?: string | string;
  sha256?: string;
  urlParser?: string;
  bodyLengthChecker?: string;
  streamCollector?: string;
  base64Decoder?: string;
  base64Encoder?: string;
  utf8Decoder?: string;
  utf8Encoder?: string;
  runtime?: string | string;
  disableHostPrefix?: string | false | true;
  serviceId?: string | string;
  useDualstackEndpoint?: string | false | true;
  useFipsEndpoint?: string | false | true;
  defaultUserAgentProvider?: string;
  region?: string | string;
  credentialDefaultProvider?: string;
  maxAttempts?: string | string;
  retryMode?: string | string;
  logger?: string | Logger;
  extensions?: string | string;
  defaultsMode?:
    | string
    | "standard"
    | "in-region"
    | "cross-region"
    | "mobile"
    | "auto"
    | "legacy";
  endpointDiscoveryEnabledProvider?: string;
  endpoint?: string | string | Endpoint;
  endpointProvider?: string;
  tls?: string | false | true;
  retryStrategy?: string | RetryStrategy;
  customUserAgent?: string | string | string;
  httpAuthSchemes?: string | string;
  httpAuthSchemeProvider?: string;
  credentials?: string;
  signer?: string;
  signingEscapePath?: string | false | true;
  systemClockOffset?: string | string;
  signingRegion?: string | string;
  signerConstructor?: string;
  endpointCacheSize?: string | string;
  endpointDiscoveryEnabled?: string | false | true;
};
