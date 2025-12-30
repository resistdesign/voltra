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
} from "../common/Types";
import { getPathArray } from "../../../../common/Routing";

/**
 * Error codes for S3 file driver operations.
 */
export const S3_FILE_DRIVER_ERRORS = {
  /**
   * File path contains invalid segments.
   */
  INVALID_PATH: "INVALID_PATH",
};

/**
 * Build a full S3 object key for a file.
 * @param file File location info.
 * @param baseDirectory Optional base directory prefix.
 * @returns Full object key for the file.
 */
export const getFullFileKey = ({
  file,
  baseDirectory,
}: {
  file: BaseFileLocationInfo;
  baseDirectory?: string;
}): string => {
  const { directory, name } = file;
  const fullFileKey = `${baseDirectory ? `${baseDirectory}/` : ""}${
    directory ? `${directory}/` : ""
  }${name}`;
  const pathArray = getPathArray(fullFileKey, "/", false);

  if (
    pathArray.includes("..") ||
    pathArray.includes(".") ||
    pathArray.includes("")
  ) {
    throw {
      message: S3_FILE_DRIVER_ERRORS.INVALID_PATH,
      file,
      baseDirectory,
    };
  } else {
    return fullFileKey;
  }
};

/**
 * Parse a full key into file location info.
 * @param path Full object key path.
 * @returns Base file location info.
 */
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
  /**
   * Optional S3 client configuration.
   */
  s3Config?: S3ClientConfig;
  /**
   * S3 bucket name for file storage.
   */
  bucketName: string;
  /**
   * Optional URL expiration time in seconds.
   */
  urlExpirationInSeconds?: number;
};

/**
 * Use S3 as a {@link CloudFileServiceDriver} for {@link BaseFile}s.
 */
export class S3FileDriver implements CloudFileServiceDriver {
  protected s3: S3;

  /**
   * @param config Driver configuration including S3 client and bucket settings.
   */
  constructor(protected config: S3FileDriverConfig) {
    const { s3Config = {} } = config;

    this.s3 = new S3(s3Config);
  }

  /**
   * Get a signed URL for uploading a file.
   * @returns Signed URL for uploading the file.
   */
  public getFileUploadUrl = async (
    /**
     * File location info for the upload.
     */
    file: BaseFileLocationInfo,
    /**
     * Optional base directory prefix.
     */
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
   * @returns Signed URL for downloading the file.
   */
  public getFileDownloadUrl = async (
    /**
     * File location info for the download.
     */
    file: BaseFileLocationInfo,
    /**
     * Optional base directory prefix.
     */
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
   * @returns Promise resolved once the file is deleted.
   */
  public deleteFile = async (
    /**
     * File location info to delete.
     */
    file: BaseFileLocationInfo,
    /**
     * Optional base directory prefix.
     */
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
   * @returns File list and cursor.
   */
  public listFiles = async (
    /**
     * Optional path prefix to list within.
     */
    path?: string,
    /**
     * Optional base directory prefix.
     */
    baseDirectory?: string,
    /**
     * Maximum number of files to return.
     */
    maxNumberOfFiles: number = 1,
    /**
     * Optional cursor string for pagination.
     */
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
