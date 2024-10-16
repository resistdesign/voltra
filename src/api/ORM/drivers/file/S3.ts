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
  FileServiceDriver,
} from "../../../ServiceTypes";

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
 * Use S3 as a {@link FileServiceDriver}.
 * */
export const getS3FileDriver = ({
  config = {},
  bucketName,
  urlExpirationInSeconds,
}: {
  config?: S3ClientConfig;
  bucketName: string;
  urlExpirationInSeconds?: number;
}): FileServiceDriver => {
  const s3 = new S3(config);

  return {
    getFileUploadUrl: async (file, baseDirectory) => {
      const params: PutObjectCommandInput = {
        Bucket: bucketName,
        Key: getFullFileKey({ file, baseDirectory }),
      };

      return await getSignedUrl(s3, new PutObjectCommand(params), {
        expiresIn: urlExpirationInSeconds,
      });
    },
    getFileDownloadUrl: async (file, baseDirectory) => {
      const params: GetObjectCommandInput = {
        Bucket: bucketName,
        Key: getFullFileKey({ file, baseDirectory }),
      };

      return await getSignedUrl(s3, new GetObjectCommand(params), {
        expiresIn: urlExpirationInSeconds,
      });
    },
    deleteFile: async (file, baseDirectory) => {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: getFullFileKey({ file, baseDirectory }),
        }),
      );
    },
    listFiles: async (
      path,
      baseDirectory,
      maxNumberOfFiles = Infinity,
      cursor,
    ) => {
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
          await s3.send(
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
          } = await s3.send(
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
    },
  };
};
