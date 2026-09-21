/**
 * S3 object persistence used by Voltra's S3 indexing driver.
 *
 * Higher-level indexing semantics remain in the generic Indexing subsystem.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

export type S3IndexStoredObject<T = unknown> = {
  value: T;
  etag?: string;
};

export type S3IndexObjectListOptions = {
  limit?: number;
  cursor?: string;
  /** Exclusive physical object key for key-addressable paging. */
  afterKey?: string;
};

export type S3IndexObjectListPage = {
  keys: string[];
  cursor?: string;
};

export type S3IndexConditionalPutOptions = {
  ifMatch?: string;
  ifNoneMatch?: boolean;
};

export type S3IndexConditionalPutResult = {
  conditionFailed?: boolean;
  etag?: string;
};

/**
 * Minimal object-store contract used by S3 indexing implementations.
 *
 * Tests may provide an in-memory implementation; production uses
 * {@link AwsS3IndexObjectStore}.
 */
export type S3IndexObjectStore = {
  get<T = unknown>(key: string): Promise<S3IndexStoredObject<T> | undefined>;
  put<T = unknown>(
    key: string,
    value: T,
    options?: S3IndexConditionalPutOptions,
  ): Promise<S3IndexConditionalPutResult>;
  delete(key: string): Promise<void>;
  list(
    prefix: string,
    options?: S3IndexObjectListOptions,
  ): Promise<S3IndexObjectListPage>;
};

export type AwsS3IndexObjectStoreConfig = {
  bucketName: string;
  prefix?: string;
  s3?: S3;
  s3Config?: S3ClientConfig;
};

const joinKey = (prefix: string | undefined, key: string): string =>
  [prefix?.replace(/^\/+|\/+$/g, ""), key.replace(/^\/+/, "")]
    .filter((part): part is string => !!part)
    .join("/");

const stripPrefix = (prefix: string | undefined, key: string): string => {
  const normalized = prefix?.replace(/^\/+|\/+$/g, "");
  return normalized && key.startsWith(`${normalized}/`)
    ? key.slice(normalized.length + 1)
    : key;
};

const isMissingObjectError = (error: unknown): boolean => {
  const record =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : {};
  const metadata =
    typeof record.$metadata === "object" && record.$metadata !== null
      ? (record.$metadata as Record<string, unknown>)
      : {};
  return (
    record.name === "NoSuchKey" ||
    record.name === "NotFound" ||
    metadata.httpStatusCode === 404
  );
};

const isConditionalFailure = (error: unknown): boolean => {
  const record =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : {};
  const metadata =
    typeof record.$metadata === "object" && record.$metadata !== null
      ? (record.$metadata as Record<string, unknown>)
      : {};
  return (
    record.name === "PreconditionFailed" || metadata.httpStatusCode === 412
  );
};

/** AWS SDK v3 implementation of the minimal S3 index object-store contract. */
export class AwsS3IndexObjectStore implements S3IndexObjectStore {
  private readonly s3: S3;
  private readonly bucketName: string;
  private readonly prefix?: string;

  constructor(config: AwsS3IndexObjectStoreConfig) {
    this.bucketName = config.bucketName;
    this.prefix = config.prefix;
    this.s3 = config.s3 ?? new S3(config.s3Config ?? {});
  }

  async get<T = unknown>(
    key: string,
  ): Promise<S3IndexStoredObject<T> | undefined> {
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: joinKey(this.prefix, key),
        }),
      );
      const body = response.Body as
        | { transformToString?: () => Promise<string> }
        | undefined;
      const text = body?.transformToString
        ? await body.transformToString()
        : undefined;
      if (typeof text !== "string") {
        return undefined;
      }
      return {
        value: JSON.parse(text) as T,
        ...(response.ETag ? { etag: response.ETag } : {}),
      };
    } catch (error) {
      if (isMissingObjectError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async put<T = unknown>(
    key: string,
    value: T,
    options: S3IndexConditionalPutOptions = {},
  ): Promise<S3IndexConditionalPutResult> {
    try {
      const response = await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: joinKey(this.prefix, key),
          Body: JSON.stringify(value),
          ContentType: "application/json",
          ...(options.ifMatch ? { IfMatch: options.ifMatch } : {}),
          ...(options.ifNoneMatch ? { IfNoneMatch: "*" } : {}),
        }),
      );
      return {
        ...(response.ETag ? { etag: response.ETag } : {}),
      };
    } catch (error) {
      if (isConditionalFailure(error)) {
        return { conditionFailed: true };
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: joinKey(this.prefix, key),
      }),
    );
  }

  async list(
    prefix: string,
    options: S3IndexObjectListOptions = {},
  ): Promise<S3IndexObjectListPage> {
    const response = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: joinKey(this.prefix, prefix),
        ContinuationToken: options.cursor,
        ...(!options.cursor && options.afterKey
          ? { StartAfter: joinKey(this.prefix, options.afterKey) }
          : {}),
        MaxKeys: Math.max(1, options.limit ?? 100),
      }),
    );
    return {
      keys: (response.Contents ?? [])
        .map(({ Key }) => Key)
        .filter((key): key is string => typeof key === "string")
        .map((key) => stripPrefix(this.prefix, key)),
      ...(response.NextContinuationToken
        ? { cursor: response.NextContinuationToken }
        : {}),
    };
  }
}
