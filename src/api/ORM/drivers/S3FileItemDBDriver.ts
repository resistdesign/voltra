import {
  CopyObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import {
  getBaseFileLocationInfo,
  getFullFileKey,
  S3FileDriver,
} from "./S3FileItemDBDriver/S3FileDriver";
import {
  getFilterTypeInfoDataItemsBySearchCriteria,
  getSortedItems,
} from "../../../common/SearchUtils";
import {
  BaseFile,
  BaseFileLocationInfo,
  CloudFileServiceDriver,
  DATA_ITEM_DB_DRIVER_ERRORS,
  DataItemDBDriver,
  DataItemDBDriverConfig,
  SupportedDataItemDBDriverEntry,
} from "./Types";
import { S3SpecificConfig } from "./S3FileItemDBDriver/ConfigTypes";
import Path from "path";
import FS from "fs";
import { getTypeInfoMapFromTypeScript } from "../../../common/TypeParsing";
import { ListItemsConfig } from "../../../common/SearchTypes";

export type BaseFileItem = {
  id: string;
} & BaseFile;

/**
 * Use S3 as a {@link DataItemDBDriver} for {@link BaseFileItem}s.
 * */
export class S3FileItemDBDriver
  implements DataItemDBDriver<BaseFileItem, "id">
{
  protected specificConfig: S3SpecificConfig;
  protected s3: S3;
  protected s3FileDriver: CloudFileServiceDriver;

  constructor(protected config: DataItemDBDriverConfig<BaseFileItem, "id">) {
    const { dbSpecificConfig } = config;
    const { s3Config, bucketName, urlExpirationInSeconds } =
      dbSpecificConfig as S3SpecificConfig;

    this.specificConfig = dbSpecificConfig as S3SpecificConfig;
    this.s3 = new S3(s3Config as S3ClientConfig);
    this.s3FileDriver = new S3FileDriver({
      s3Config: s3Config as S3ClientConfig,
      bucketName,
      urlExpirationInSeconds,
    });
  }

  /**
   * Create a new @{@link BaseFileItem}.
   * */
  public createItem = async (item: Partial<Omit<BaseFileItem, "id">>) => {
    const { tableName } = this.config;
    const { bucketName } = this.specificConfig;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: getFullFileKey({
          file: item as BaseFileLocationInfo,
          // SECURITY: `baseDirectory` is only used internally here, and not as part of the `id`.
          baseDirectory: tableName,
        }),
        Body: "",
      }),
    );

    return getFullFileKey({
      file: item as BaseFileLocationInfo,
    });
  };

  /**
   * Read a @{@link BaseFileItem} by its id.
   * */
  public readItem = async (
    id: string,
    selectFields?: (keyof BaseFileItem)[],
  ) => {
    const { tableName } = this.config;
    const { bucketName } = this.specificConfig;

    if (typeof id === "undefined") {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    } else {
      const itemLoc: BaseFileLocationInfo = getBaseFileLocationInfo(id);
      const {
        ContentType = "",
        ContentLength = 0,
        LastModified,
        Metadata: {} = {},
      } = await this.s3.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: getFullFileKey({
            file: itemLoc,
            baseDirectory: tableName,
          }),
        }),
      );
      const item: BaseFileItem = {
        ...itemLoc,
        id,
        updatedOn: LastModified?.getTime() || 0,
        mimeType: ContentType,
        sizeInBytes: ContentLength,
        isDirectory: ContentType === "application/x-directory",
        uploadUrl:
          selectFields && selectFields.includes("uploadUrl")
            ? await this.s3FileDriver.getFileUploadUrl(itemLoc, tableName)
            : undefined,
        downloadUrl:
          selectFields && selectFields.includes("downloadUrl")
            ? await this.s3FileDriver.getFileDownloadUrl(itemLoc, tableName)
            : undefined,
      };

      return item;
    }
  };

  /**
   * Update a @{@link BaseFileItem}.
   * */
  public updateItem = async (
    uniqueIdentifier: BaseFileItem["id"],
    item: Partial<BaseFileItem>,
  ) => {
    const { directory, name } = item;
    const { tableName } = this.config;
    const { bucketName } = this.specificConfig;

    const oldItemLoc: BaseFileLocationInfo =
      getBaseFileLocationInfo(uniqueIdentifier);
    const { name: oldName, directory: oldDirectory } = oldItemLoc;

    if (name && (name !== oldName || directory !== oldDirectory)) {
      await this.s3.send(
        new CopyObjectCommand({
          Bucket: bucketName,
          Key: getFullFileKey({
            file: {
              directory,
              name,
            },
            baseDirectory: tableName,
          }),
          CopySource: getFullFileKey({
            file: oldItemLoc,
            baseDirectory: tableName,
          }),
        }),
      );
      await this.s3FileDriver.deleteFile(oldItemLoc, tableName);
    }

    await this.readItem(uniqueIdentifier);

    return true;
  };

  /**
   * Delete a @{@link BaseFileItem} by its id.
   */
  public deleteItem = async (id: string) => {
    const { tableName } = this.config;

    if (typeof id === "undefined") {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    } else {
      await this.readItem(id);
      await this.s3FileDriver.deleteFile(
        getBaseFileLocationInfo(id),
        tableName,
      );
    }

    return true;
  };

  /**
   * List @{@link BaseFileItem}s by a given criteria.
   */
  public listItems = async (
    config: ListItemsConfig,
    selectFields?: (keyof BaseFileItem)[],
  ) => {
    const { tableName } = this.config;
    const {
      itemsPerPage = Infinity,
      cursor,
      sortFields = [],
      criteria,
    } = config;
    const { files: baseFileList = [], cursor: newCursor } =
      await this.s3FileDriver.listFiles(
        undefined,
        tableName,
        itemsPerPage,
        cursor,
      );
    const currentFileItems = baseFileList.map((bF) => ({
      id: getFullFileKey({
        file: bF,
      }),
      ...bF,
    }));
    const filteredFiles = criteria
      ? (getFilterTypeInfoDataItemsBySearchCriteria(
          criteria,
          currentFileItems,
        ) as BaseFileItem[])
      : currentFileItems;
    const expandedFiles: Partial<BaseFileItem>[] = [];

    for (const fF of filteredFiles) {
      expandedFiles.push({
        ...fF,
        uploadUrl: selectFields?.includes("uploadUrl")
          ? await this.s3FileDriver.getFileUploadUrl(fF, tableName)
          : undefined,
        downloadUrl: selectFields?.includes("downloadUrl")
          ? await this.s3FileDriver.getFileDownloadUrl(fF, tableName)
          : undefined,
      } as Partial<BaseFileItem>);
    }

    return {
      items: getSortedItems(
        sortFields,
        expandedFiles,
      ) as Partial<BaseFileItem>[],
      cursor: newCursor,
    };
  };
}

/**
 * The supported DB driver entry for the S3 File {@link DataItemDBDriver}.
 * */
export const S3SupportedFileItemDBDriverEntry: SupportedDataItemDBDriverEntry =
  {
    factory: <
      ItemType extends Record<any, any>,
      UniquelyIdentifyingFieldName extends keyof ItemType,
    >(
      config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
    ): DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> => {
      return new S3FileItemDBDriver(config as any) as any;
    },
    getDBSpecificConfigTypeInfo: () => {
      const configTypesPath = Path.join(
        __dirname,
        "S3DataItemDBDriver",
        "ConfigTypes.ts",
      );
      const configTypesTS = FS.readFileSync(configTypesPath, "utf8");
      const typeInfoMap = getTypeInfoMapFromTypeScript(configTypesTS);

      return {
        entryTypeName: "S3SpecificConfig",
        typeInfoMap,
      };
    },
  };
