import {
  CopyObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import { DBServiceItemDriver } from "../../DBServiceTypes";
import { BaseFile, BaseFileLocationInfo } from "../../FileServiceTypes";
import {
  getBaseFileLocationInfo,
  getFullFileKey,
  getS3FileDriver,
} from "../file/S3";

export type BaseFileItem = {
  id: string;
} & BaseFile;

export type S3DBServiceItemDriverConfig = {
  config?: S3ClientConfig;
  bucketName: string;
  baseDirectory: string;
  urlExpirationInSeconds?: number;
  readOnly?: boolean;
};

export const getS3DBServiceItemDriver = ({
  config = {},
  bucketName,
  baseDirectory,
  urlExpirationInSeconds,
  readOnly = false,
}: S3DBServiceItemDriverConfig): DBServiceItemDriver<BaseFileItem, "id"> => {
  const s3 = new S3(config);
  const s3FileDriver = getS3FileDriver({
    config,
    bucketName,
    urlExpirationInSeconds,
  });
  const driver: DBServiceItemDriver<BaseFileItem, "id"> = {
    createItem: async (item) => {
      const uploadUrl = await s3FileDriver.getFileUploadUrl(
        item as BaseFileLocationInfo,
        baseDirectory,
      );
      const downloadUrl = await s3FileDriver.getFileDownloadUrl(
        item as BaseFileLocationInfo,
        baseDirectory,
      );

      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: getFullFileKey({
            file: item as BaseFileLocationInfo,
            baseDirectory,
          }),
          Body: "",
        }),
      );

      const {
        ContentType = "",
        ContentLength = 0,
        LastModified,
        Metadata: {} = {},
      } = await s3.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: getFullFileKey({
            file: item as BaseFileLocationInfo,
            baseDirectory,
          }),
        }),
      );

      return {
        id: getFullFileKey({
          file: item as BaseFileLocationInfo,
        }),
        ...item,
        updatedOn: LastModified?.getTime() || 0,
        mimeType: ContentType,
        sizeInBytes: ContentLength,
        isDirectory: ContentType === "application/x-directory",
        uploadUrl,
        downloadUrl,
      } as BaseFileItem;
    },
    readItem: async (id) => {
      const itemLoc: BaseFileLocationInfo = getBaseFileLocationInfo(id);
      const {
        ContentType = "",
        ContentLength = 0,
        LastModified,
        Metadata: {} = {},
      } = await s3.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: getFullFileKey({
            file: itemLoc,
            baseDirectory,
          }),
        }),
      );
      const item: BaseFile = {
        ...itemLoc,
        updatedOn: LastModified?.getTime() || 0,
        mimeType: ContentType,
        sizeInBytes: ContentLength,
        isDirectory: ContentType === "application/x-directory",
      };

      return {
        id: getFullFileKey({
          file: itemLoc,
        }),
        ...item,
      };
    },
    updateItem: async (item) => {
      const { directory, name, id } = item;
      const oldItemLoc: BaseFileLocationInfo = getBaseFileLocationInfo(id);
      const { name: oldName, directory: oldDirectory } = oldItemLoc;

      if (name && (name !== oldName || directory !== oldDirectory)) {
        await s3.send(
          new CopyObjectCommand({
            Bucket: bucketName,
            Key: getFullFileKey({
              file: {
                directory,
                name,
              },
              baseDirectory,
            }),
            CopySource: getFullFileKey({
              file: oldItemLoc,
              baseDirectory,
            }),
          }),
        );
        await s3FileDriver.deleteFile(oldItemLoc, baseDirectory);
      }

      return driver.readItem(id);
    },
    deleteItem: async (id) => {
      const oldFile = await driver.readItem(id);

      await s3FileDriver.deleteFile(getBaseFileLocationInfo(id), baseDirectory);

      return oldFile;
    },
    listItems: async (config) => {
      const { itemsPerPage, cursor } = config;
      const { files: baseFileList, cursor: newCursor } =
        await s3FileDriver.listFiles(
          undefined,
          baseDirectory,
          itemsPerPage,
          cursor,
        );

      return {
        items: baseFileList.map((bF) => ({
          id: getFullFileKey({
            file: bF,
          }),
          ...bF,
        })),
        cursor: newCursor,
      };
    },
  };

  return readOnly
    ? {
        createItem: async () => {
          throw new Error("Method Not Allowed");
        },
        readItem: driver.readItem,
        updateItem: async () => {
          throw new Error("Method Not Allowed");
        },
        deleteItem: async () => {
          throw new Error("Method Not Allowed");
        },
        listItems: driver.listItems,
      }
    : driver;
};
