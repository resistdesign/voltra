import {
  CopyObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import {
  BaseFile,
  BaseFileLocationInfo,
  DBServiceItemDriver,
} from "../../ServiceTypes";
import {
  getBaseFileLocationInfo,
  getFullFileKey,
  getS3FileDriver,
} from "../file";
import {
  getFilterTypeInfoDataItemsBySearchCriteria,
  getSortedItems,
} from "../../../../common/SearchUtils";

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

export const S3_DB_SERVICE_ITEM_DRIVER_ERRORS = {
  INVALID_REQUEST: "INVALID_REQUEST",
  MISSING_ID: "MISSING_ID",
};

/**
 * Use S3 as a {@link DBServiceItemDriver} for {@link BaseFileItem}s.
 * */
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

      return getFullFileKey({
        file: item as BaseFileLocationInfo,
      });
    },
    readItem: async (id) => {
      if (typeof id === "undefined") {
        throw new Error(S3_DB_SERVICE_ITEM_DRIVER_ERRORS.MISSING_ID);
      } else {
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
      }
    },
    updateItem: async (item) => {
      const { directory, name, id } = item;

      if (typeof id === "undefined") {
        throw new Error(S3_DB_SERVICE_ITEM_DRIVER_ERRORS.MISSING_ID);
      } else {
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

        await driver.readItem(id);
      }

      return true;
    },
    deleteItem: async (id) => {
      if (typeof id === "undefined") {
        throw new Error(S3_DB_SERVICE_ITEM_DRIVER_ERRORS.MISSING_ID);
      } else {
        await driver.readItem(id);
        await s3FileDriver.deleteFile(
          getBaseFileLocationInfo(id),
          baseDirectory,
        );
      }

      return true;
    },
    listItems: async (config) => {
      const {
        itemsPerPage,
        cursor,
        sortFields = [],
        criteria,
        checkExistence,
      } = config;

      let filteredFiles: BaseFileItem[] = [],
        nextCursor: string | undefined = undefined;

      if (checkExistence) {
      } else {
        const { files: baseFileList = [], cursor: newCursor } =
          await s3FileDriver.listFiles(
            undefined,
            baseDirectory,
            itemsPerPage,
            cursor,
          );
        const currentFileItems = baseFileList.map((bF) => ({
          id: getFullFileKey({
            file: bF,
          }),
          ...bF,
        }));

        filteredFiles = criteria
          ? (getFilterTypeInfoDataItemsBySearchCriteria(
              criteria,
              currentFileItems,
            ) as BaseFileItem[])
          : currentFileItems;
        nextCursor = newCursor;
      }

      return checkExistence
        ? filteredFiles.length > 0
        : {
            items: getSortedItems(sortFields, filteredFiles),
            cursor: nextCursor,
          };
    },
  };

  return readOnly
    ? {
        createItem: async () => {
          throw new Error(S3_DB_SERVICE_ITEM_DRIVER_ERRORS.INVALID_REQUEST);
        },
        readItem: driver.readItem,
        updateItem: async () => {
          throw new Error(S3_DB_SERVICE_ITEM_DRIVER_ERRORS.INVALID_REQUEST);
        },
        deleteItem: async () => {
          throw new Error(S3_DB_SERVICE_ITEM_DRIVER_ERRORS.INVALID_REQUEST);
        },
        listItems: driver.listItems,
      }
    : driver;
};
