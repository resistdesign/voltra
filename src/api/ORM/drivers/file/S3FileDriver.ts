import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandInput,
  HeadObjectCommand,
  ListObjectsCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3,
  S3ClientConfig,
} from "@aws-sdk/client-s3";

import {
  BaseFile,
  BaseFileLocationInfo,
  CloudFileServiceDriver,
} from "../Types";

export const getFullFileKey = ({
  file,
  baseDirectory,
}: {
  file: BaseFileLocationInfo;
  baseDirectory?: string;
}) => {
  const { directory, name } = file;

  return `${baseDirectory ? `${baseDirectory}/` : ""}${
    directory ? `${directory}/` : ""
  }${name}`;
};

export const getBaseFileLocationInfo = (path: string): BaseFileLocationInfo => {
  const [name, ...directoryParts] = path.split("/").reverse();

  return {
    directory: directoryParts.reverse().join("/"),
    name,
  };
};

/**
 * The configuration for an {@link S3FileDriver}.
 * */
export type S3FileDriverConfig = {
  s3Config?: S3ClientConfig;
  bucketName: string;
  urlExpirationInSeconds?: number;
};

/**
 * Use S3 as a {@link CloudFileServiceDriver} for {@link BaseFile}s.
 */
export class S3FileDriver implements CloudFileServiceDriver {
  protected s3: S3;

  constructor(protected config: S3FileDriverConfig) {
    const { s3Config = {} } = config;

    this.s3 = new S3(s3Config);
  }

  /**
   * Get a signed URL for uploading a file.
   */
  public getFileUploadUrl = async (
    file: BaseFileLocationInfo,
    baseDirectory?: string,
  ) => {
    const { bucketName, urlExpirationInSeconds } = this.config;
    const params: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: getFullFileKey({ file, baseDirectory }),
    };

    return await getSignedUrl(this.s3, new PutObjectCommand(params), {
      expiresIn: urlExpirationInSeconds,
    });
  };

  /**
   * Get a signed URL for downloading a file.
   */
  public getFileDownloadUrl = async (
    file: BaseFileLocationInfo,
    baseDirectory?: string,
  ) => {
    const { bucketName, urlExpirationInSeconds } = this.config;
    const params: GetObjectCommandInput = {
      Bucket: bucketName,
      Key: getFullFileKey({ file, baseDirectory }),
    };

    return await getSignedUrl(this.s3, new GetObjectCommand(params), {
      expiresIn: urlExpirationInSeconds,
    });
  };

  /**
   * Delete a file.
   */
  public deleteFile = async (
    file: BaseFileLocationInfo,
    baseDirectory?: string,
  ) => {
    const { bucketName } = this.config;
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: getFullFileKey({ file, baseDirectory }),
      }),
    );
  };

  /**
   * List the files and directories in a directory.
   */
  public listFiles = async (
    path?: string,
    baseDirectory?: string,
    maxNumberOfFiles: number = 1,
    cursor?: string,
  ) => {
    const { bucketName } = this.config;
    const files: BaseFile[] = [];

    let allContents: ListObjectsCommandOutput["Contents"] = [],
      continuationToken: string | undefined = cursor,
      listAttempted = false;

    while (
      (!listAttempted || continuationToken) &&
      files.length < maxNumberOfFiles
    ) {
      listAttempted = true;

      const listObjectsV2CommandOutput: ListObjectsV2CommandOutput =
        await this.s3.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: `${baseDirectory || ""}${path || ""}`,
            ContinuationToken: continuationToken,
            MaxKeys:
              maxNumberOfFiles === Infinity
                ? undefined
                : maxNumberOfFiles - allContents.length,
          }),
        );
      const {
        Contents = [],
        NextContinuationToken,
      }: ListObjectsV2CommandOutput = listObjectsV2CommandOutput;

      allContents = [...allContents, ...Contents];
      continuationToken = NextContinuationToken;
    }

    for (const file of allContents) {
      if (file.Key) {
        const {
          ContentType = "",
          ContentLength = 0,
          LastModified,
          Metadata: {} = {},
        } = await this.s3.send(
          new HeadObjectCommand({
            Bucket: bucketName,
            Key: file.Key,
          }),
        );

        files.push({
          updatedOn: LastModified?.getTime() || 0,
          mimeType: ContentType,
          sizeInBytes: ContentLength,
          directory: path,
          name: file.Key.split("/").pop() || "",
          isDirectory: ContentType === "application/x-directory",
        });
      }
    }

    return {
      files,
      cursor: continuationToken,
    };
  };
}
