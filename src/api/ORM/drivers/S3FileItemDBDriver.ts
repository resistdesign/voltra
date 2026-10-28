/**
 * @packageDocumentation
 *
 * S3-backed file item driver that exposes files as ORM items with upload/download URLs.
 */
import {
  TypeInfoORMServiceError,
  TypeInfoORMCreateConfig,
  TypeInfoORMReadConfig,
  TypeInfoORMUpdateConfig,
} from "../../../common/TypeInfoORM";
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
  DataItemOperationConfig,
  CanonicalWriteCommittedError,
  DataItemDBDriver,
  DataItemDBDriverConfig,
  SupportedDataItemDBDriverEntry,
} from "./common/Types";
import { S3SpecificConfig } from "./S3FileItemDBDriver/ConfigTypes";
import { ListItemsConfig } from "../../../common/SearchTypes";
import ConfigTypeInfoMap from "./S3FileItemDBDriver/ConfigTypeInfoMap.json";
import { TypeInfoMap } from "../../../common/TypeParsing/TypeInfo";

/**
 * ORM file item with id plus base file fields.
 */
export type BaseFileItem = {
  /**
   * File identifier (full key).
   */
  id: string;
} & BaseFile;

/**
 * Use S3 as a {@link DataItemDBDriver} for {@link BaseFileItem}s.
 * */
export class S3FileItemDBDriver implements DataItemDBDriver<
  BaseFileItem,
  "id"
> {
  protected specificConfig: S3SpecificConfig;
  protected s3: S3;
  protected s3FileDriver: CloudFileServiceDriver;

  /**
   * @param config Driver configuration including S3 settings.
   */
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

  private inspect = async (
    config: DataItemOperationConfig<BaseFileItem> | undefined,
    before: BaseFileItem | undefined,
  ) => {
    if (
      config?.coordination?.exclusive ||
      (config?.coordination?.inspect &&
        (!config.coordination.guardFields ||
          config.coordination.guardFields.some(
            (field) => !["id", "name", "directory"].includes(field),
          )))
    ) {
      // HEAD metadata has no atomic whole-metadata CAS. Location-only DAC is
      // immutable for this key; mutable metadata authorization is unsupported.
      throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
    }
    await config?.coordination?.inspect?.(before);
  };

  private prior = async (id: string): Promise<BaseFileItem | undefined> => {
    try {
      return await this.readItem(id);
    } catch (error: any) {
      if (error?.message === DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND)
        return undefined;
      throw error;
    }
  };

  private notify = async (
    config: DataItemOperationConfig<BaseFileItem> | undefined,
    before: BaseFileItem | undefined,
    after: () => Promise<BaseFileItem | undefined>,
  ) => {
    if (!config?.coordination?.changed) return;
    try {
      await config.coordination.changed(before, await after());
    } catch (cause) {
      throw new CanonicalWriteCommittedError(cause);
    }
  };

  /**
   * Create a new @{@link BaseFileItem}.
   * @param item New file item payload without the id field.
   * @returns Generated file id.
   * */
  public createItem = async (
    item: Partial<Omit<BaseFileItem, "id">>,
    createConfig?: TypeInfoORMCreateConfig &
      DataItemOperationConfig<BaseFileItem>,
  ) => {
    if (createConfig?.ifAbsent)
      throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
    const { tableName } = this.config;
    const { bucketName } = this.specificConfig;
    const id = getFullFileKey({ file: item as BaseFileLocationInfo });
    const before = createConfig?.coordination
      ? await this.prior(id)
      : undefined;
    await this.inspect(createConfig, before);

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

    await this.notify(createConfig, before, () => this.readItem(id));
    return id;
  };

  /**
   * Read a @{@link BaseFileItem} by its id.
   * @param id Unique identifier value for the file.
   * @param selectFields Optional fields to select from the file item.
   * @param _readConfig Required consistency; canonical reads honor strong consistency.
   * @returns File item payload (partial when selected fields are used).
   * */
  public readItem = async (
    id: string,
    selectFields?: (keyof BaseFileItem)[],
    _readConfig?: TypeInfoORMReadConfig & DataItemOperationConfig<BaseFileItem>,
  ) => {
    const { tableName } = this.config;
    const { bucketName } = this.specificConfig;

    if (typeof id === "undefined") {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    } else {
      const itemLoc: BaseFileLocationInfo = getBaseFileLocationInfo(id);
      let head;
      try {
        head = await this.s3.send(
          new HeadObjectCommand({
            Bucket: bucketName,
            Key: getFullFileKey({ file: itemLoc, baseDirectory: tableName }),
          }),
        );
      } catch (error: any) {
        if (
          error?.name !== "NotFound" &&
          error?.$metadata?.httpStatusCode !== 404
        )
          throw error;
        if (_readConfig?.coordination?.exclusive)
          throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
        await _readConfig?.coordination?.inspect?.(undefined);
        throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
      }
      const {
        ContentType = "",
        ContentLength = 0,
        LastModified,
        Metadata: {} = {},
      } = head;
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

      await _readConfig?.coordination?.inspect?.(item);
      return item;
    }
  };

  /**
   * Update a @{@link BaseFileItem}.
   * Conditional canonical updates are unsupported and fail before file I/O.
   * @param uniqueIdentifier Unique identifier value for the file.
   * @param item Partial update payload for the file.
   * @returns True when the item was updated or already exists at the requested location.
   * @throws When a same-location update target does not exist or a rename destination is occupied.
   * */
  public updateItem = async (
    uniqueIdentifier: BaseFileItem["id"],
    item: Partial<BaseFileItem>,
    updateConfig?: TypeInfoORMUpdateConfig &
      DataItemOperationConfig<BaseFileItem>,
  ) => {
    if (updateConfig?.preconditions !== undefined) {
      throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
    }
    const before = updateConfig?.coordination
      ? await this.prior(uniqueIdentifier)
      : undefined;
    await this.inspect(updateConfig, before);
    const {
      directory = getBaseFileLocationInfo(uniqueIdentifier).directory,
      name,
    } = item;
    const { tableName } = this.config;
    const { bucketName } = this.specificConfig;

    const oldItemLoc: BaseFileLocationInfo =
      getBaseFileLocationInfo(uniqueIdentifier);
    const { name: oldName, directory: oldDirectory } = oldItemLoc;

    if (name && (name !== oldName || directory !== oldDirectory)) {
      try {
        await this.s3.send(
          new CopyObjectCommand({
            // Source authorization does not permit overwriting another identity.
            // Enforce absence atomically, including destinations created after inspection.
            IfNoneMatch: "*",
            Bucket: bucketName,
            Key: getFullFileKey({
              file: {
                directory,
                name,
              },
              baseDirectory: tableName,
            }),
            CopySource: `${encodeURIComponent(bucketName)}/${getFullFileKey({
              file: oldItemLoc,
              baseDirectory: tableName,
            })
              .split("/")
              .map(encodeURIComponent)
              .join("/")}`,
          }),
        );
      } catch (error: any) {
        if (
          error?.name === "PreconditionFailed" ||
          error?.name === "ConditionalRequestConflict" ||
          error?.$metadata?.httpStatusCode === 412 ||
          error?.$metadata?.httpStatusCode === 409
        ) {
          throw new Error(TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT, {
            cause: error,
          });
        }
        throw error;
      }
      try {
        await this.s3FileDriver.deleteFile(oldItemLoc, tableName);
      } catch (cause) {
        throw new CanonicalWriteCommittedError(cause);
      }
    } else if (!before) {
      // No copy will validate the source. HEAD must establish that this no-op
      // refers to an existing canonical object, even without index/DAC callbacks.
      await this.readItem(uniqueIdentifier);
    }

    const nextId =
      name && (name !== oldName || directory !== oldDirectory)
        ? getFullFileKey({ file: { directory, name } })
        : uniqueIdentifier;
    await this.notify(updateConfig, before, () => this.readItem(nextId));
    return true;
  };

  /**
   * Delete a @{@link BaseFileItem} by its id.
   * @param id Unique identifier value for the file.
   * @returns True when the item was deleted.
   */
  public deleteItem = async (
    id: string,
    deleteConfig?: DataItemOperationConfig<BaseFileItem>,
  ) => {
    const { tableName } = this.config;

    if (typeof id === "undefined") {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    } else {
      const before = await this.readItem(id);
      await this.inspect(deleteConfig, before);
      await this.s3FileDriver.deleteFile(
        getBaseFileLocationInfo(id),
        tableName,
      );
      await this.notify(deleteConfig, before, async () => undefined);
    }

    return true;
  };

  /**
   * List @{@link BaseFileItem}s by a given criteria.
   * @param config List configuration and criteria.
   * @param selectFields Optional fields to select from each file item.
   * @returns List results with items and cursor.
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
    /**
     * @param config Driver configuration.
     * @returns S3 file driver instance.
     */
    factory: <
      ItemType extends Record<any, any>,
      UniquelyIdentifyingFieldName extends keyof ItemType,
    >(
      config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
    ): DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> => {
      return new S3FileItemDBDriver(config as any) as any;
    },
    /**
     * @returns Type info pack for the S3 config.
     */
    getDBSpecificConfigTypeInfo: () => {
      return {
        entryTypeName: "S3SpecificConfig",
        typeInfoMap: ConfigTypeInfoMap as TypeInfoMap,
      };
    },
  };
