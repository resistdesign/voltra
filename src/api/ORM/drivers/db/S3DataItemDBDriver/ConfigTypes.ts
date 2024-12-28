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

export type Properties = {
  authSchemes?: string;
};

export type RetryStrategy = {
  mode?: string;
  retry: any;
};

export type Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  credentialScope?: string;
  expiration?: string;
};

export type Signer = {
  sign: any;
};

export type AbridgedS3ClientConfig = {
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
  region?: string;
  credentialDefaultProvider?: string;
  signingEscapePath?: string | false | true;
  useArnRegion?: string | false | true;
  defaultUserAgentProvider?: string;
  streamHasher?: string;
  md5?: string;
  sha1?: string;
  getAwsChunkedEncodingStream?: string;
  maxAttempts?: string;
  retryMode?: string;
  logger?: string | Logger;
  extensions?: string;
  eventStreamSerdeProvider?: string;
  /**
   * @allowCustomSelection
   * */
  defaultsMode?:
    | "standard"
    | "in-region"
    | "cross-region"
    | "mobile"
    | "auto"
    | "legacy";
  sdkStreamMixin?: string;
  endpoint?: string | Endpoint;
  endpointProvider?: string;
  tls?: string | false | true;
  retryStrategy?: string | RetryStrategy;
  credentials?: string | Credentials;
  signer?: string | Signer;
  systemClockOffset?: string;
  signingRegion?: string;
  signerConstructor?: string;
  forcePathStyle?: string | false | true;
  useAccelerateEndpoint?: string | false | true;
  disableMultiregionAccessPoints?: string | false | true;
  followRegionRedirects?: string | false | true;
  s3ExpressIdentityProvider?: string;
  customUserAgent?: string;
  useGlobalEndpoint?: string | false | true;
  disableS3ExpressSessionAuth?: string | false | true;
};

export type S3SpecificConfig = {
  s3Config?: AbridgedS3ClientConfig;
  bucketName: string;
  baseDirectory: string;
  urlExpirationInSeconds?: number;
  readOnly?: boolean;
};
