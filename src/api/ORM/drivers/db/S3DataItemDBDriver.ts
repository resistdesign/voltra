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

// TODO: Error Types SHOULD be defined at the Driver API level.
export const S3__DATA_ITEM_DB_DRIVER_ERRORS = {
  MISSING_ID: "MISSING_ID",
};

// TODO: Cleaning relational, nonexistent and selected fields SHOULD be done at the `TypeInfoORMService` level.

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
        // TODO: SECURITY: Is `getFullFileKey` safe from "../" path parts???
        // TODO: Should it use the Route Pathing utils to clean and encode the path???
        Key: getFullFileKey({
          file: item as BaseFileLocationInfo,
          // SECURITY: `baseDirectory` is only used internally here, and not as part of the `id`.
          baseDirectory: tableName,
        }),
        // TODO: Uhm, so we make the body of the item and then what!?!
        //   - Should we not save the item!?!
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
            baseDirectory: tableName,
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
  public updateItem = async (
    item: Record<"id", BaseFileItem["id"]> & Partial<BaseFileItem>,
  ) => {
    const { directory, name, id } = item;
    const { tableName } = this.config;
    const { bucketName } = this.specificConfig;

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

      await this.readItem(id);
    }

    return true;
  };

  /**
   * Delete a @{@link BaseFileItem} by its id.
   */
  public deleteItem = async (id: string) => {
    const { tableName } = this.config;

    if (typeof id === "undefined") {
      throw new Error(S3__DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
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
          tableName,
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
