import {
  CopyObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getBaseFileLocationInfo, getFullFileKey, S3FileDriver } from "../file";
import {
  getFilterTypeInfoDataItemsBySearchCriteria,
  getSortedItems,
} from "../../../../common/SearchUtils";
import {
  BaseFile,
  BaseFileLocationInfo,
  CloudFileServiceDriver,
  DataItemDBDriver,
  DataItemDBDriverConfig,
  SupportedDataItemDBDriverEntry,
} from "../Types";
import { ListItemsConfig } from "../../../../common";
import { getDataItemWithOnlySelectedFields } from "./Utils";
import { S3SpecificConfig } from "./S3DataItemDBDriver/ConfigTypes";
import Path from "path";
import FS from "fs";
import { getTypeInfoMapFromTypeScript } from "../../../../common/TypeParsing";

export type BaseFileItem = {
  id: string;
} & BaseFile;

export const S3__DATA_ITEM_DB_DRIVER_ERRORS = {
  INVALID_REQUEST: "INVALID_REQUEST",
  MISSING_ID: "MISSING_ID",
};

// TODO: Need to export a supported DB driver entry object.
// TODO: Cleaning relational, nonexistent and selected fields SHOULD be done at the `TypeInfoORMService` level.
// TODO: Error Types SHOULD be defined at the Driver API level.

/**
 * Use S3 as a {@link DataItemDBDriver} for {@link BaseFileItem}s.
 * */
export class S3DataItemDBDriver
  implements DataItemDBDriver<BaseFileItem, "id">
{
  protected specificConfig: S3SpecificConfig;
  protected s3: S3;
  protected s3FileDriver: CloudFileServiceDriver;

  constructor(protected config: DataItemDBDriverConfig<BaseFileItem, "id">) {
    const {
      // TODO: Use this for Errors???
      typeName,
      dbSpecificConfig,
      // TODO: Make `tableName` and `bucketName` (or `baseDirectory`???) interchangeable.
      //   - Call it `storageName`???
      tableName,
      // TODO: It's great but we don't need it here because we know that we use `id`.
      uniquelyIdentifyingFieldName,
      // TODO: Already known as `BaseFileItem`.
      typeInfo,
      // TODO: Incorporate this.
      //   - Do we even need this given that we use paths as IDs???
      generateUniqueIdentifier,
    } = config;
    const { s3Config, bucketName, baseDirectory, urlExpirationInSeconds } =
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
    const { readOnly, bucketName, baseDirectory } = this.specificConfig;

    if (readOnly) {
      throw new Error(S3__DATA_ITEM_DB_DRIVER_ERRORS.INVALID_REQUEST);
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        // TODO: SECURITY: Is `getFullFileKey` safe from "../" path parts???
        // TODO: Should it use the Route Pathing utils to clean and encode the path???
        Key: getFullFileKey({
          file: item as BaseFileLocationInfo,
          baseDirectory,
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
    const { bucketName, baseDirectory } = this.specificConfig;

    if (typeof id === "undefined") {
      throw new Error(S3__DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
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
      const itemWithOnlySelectedFields = getDataItemWithOnlySelectedFields(
        item,
        selectFields,
      ) as Partial<BaseFileItem>;

      return itemWithOnlySelectedFields;
    }
  };

  /**
   * Update a @{@link BaseFileItem}.
   * */
  public updateItem = async (item: Partial<BaseFileItem>) => {
    const { directory, name, id } = item;
    const { readOnly, bucketName, baseDirectory } = this.specificConfig;

    if (readOnly) {
      throw new Error(S3__DATA_ITEM_DB_DRIVER_ERRORS.INVALID_REQUEST);
    }

    if (typeof id === "undefined") {
      throw new Error(S3__DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    } else {
      const oldItemLoc: BaseFileLocationInfo = getBaseFileLocationInfo(id);
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
              baseDirectory,
            }),
            CopySource: getFullFileKey({
              file: oldItemLoc,
              baseDirectory,
            }),
          }),
        );
        await this.s3FileDriver.deleteFile(oldItemLoc, baseDirectory);
      }

      await this.readItem(id);
    }

    return true;
  };

  /**
   * Delete a @{@link BaseFileItem} by its id.
   */
  public deleteItem = async (id: string) => {
    const { readOnly, baseDirectory } = this.specificConfig;

    if (readOnly) {
      throw new Error(S3__DATA_ITEM_DB_DRIVER_ERRORS.INVALID_REQUEST);
    }

    if (typeof id === "undefined") {
      throw new Error(S3__DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    } else {
      await this.readItem(id);
      await this.s3FileDriver.deleteFile(
        getBaseFileLocationInfo(id),
        baseDirectory,
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
    const { baseDirectory } = this.specificConfig;
    const {
      itemsPerPage = Infinity,
      cursor,
      sortFields = [],
      criteria,
      checkExistence,
    } = config;

    let filteredFiles: Partial<BaseFileItem>[] = [],
      initiatedListing: boolean = false,
      nextCursor: string | undefined = undefined;

    while (
      (checkExistence || filteredFiles.length < itemsPerPage) &&
      (!initiatedListing || nextCursor)
    ) {
      const { files: baseFileList = [], cursor: newCursor } =
        await this.s3FileDriver.listFiles(
          undefined,
          baseDirectory,
          checkExistence ? 100 : itemsPerPage - filteredFiles.length,
          cursor,
        );
      const currentFileItems = baseFileList.map((bF) => ({
        id: getFullFileKey({
          file: bF,
        }),
        ...bF,
      }));

      initiatedListing = true;

      filteredFiles = criteria
        ? (getFilterTypeInfoDataItemsBySearchCriteria(
            criteria,
            currentFileItems,
          ) as BaseFileItem[])
        : currentFileItems;
      nextCursor = newCursor;
      filteredFiles = filteredFiles.map(
        (f) =>
          getDataItemWithOnlySelectedFields(
            f,
            selectFields,
          ) as Partial<BaseFileItem>,
      );

      if (checkExistence && filteredFiles.length > 0) {
        break;
      }
    }

    if (checkExistence) {
      return filteredFiles.length > 0;
    } else {
      return {
        items: getSortedItems(sortFields, filteredFiles) as BaseFileItem[],
        cursor: nextCursor,
      };
    }
  };
}

/**
 * The supported DB driver entry for the S3 {@link DataItemDBDriver}.
 * */
export const S3SupportedDataItemDBDriverEntry: SupportedDataItemDBDriverEntry =
  {
    factory: <
      ItemType extends Record<any, any>,
      UniquelyIdentifyingFieldName extends keyof ItemType,
    >(
      config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
    ) => {
      return new S3DataItemDBDriver(config as any) as any;
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
