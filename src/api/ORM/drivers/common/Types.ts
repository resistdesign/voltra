import {
  TypeInfoDataItem,
  TypeInfoPack,
} from "../../../../common/TypeParsing/TypeInfo";
import {
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys,
} from "../../../../common/ItemRelationshipInfoTypes";
import { ListItemsConfig, ListItemsResults } from "../../../../common/SearchTypes";

/**
 * The errors that can be thrown by a {@link DataItemDBDriver}.
 * */
export enum DATA_ITEM_DB_DRIVER_ERRORS {
  /**
   * Missing identifier value for the operation.
   */
  MISSING_ID = "MISSING_ID",
  /**
   * Cursor value is invalid or malformed.
   */
  INVALID_CURSOR = "INVALID_CURSOR",
  /**
   * Requested item was not found.
   */
  ITEM_NOT_FOUND = "ITEM_NOT_FOUND",
  /**
   * Missing unique identifier for an update/delete.
   */
  MISSING_UNIQUE_IDENTIFIER = "MISSING_UNIQUE_IDENTIFIER",
  /**
   * Search operator is not supported by the driver.
   */
  SEARCH_COMPARISON_OPERATOR_NOT_SUPPORTED = "SEARCH_COMPARISON_OPERATOR_NOT_SUPPORTED",
}

/**
 * The generic type for a database driver configuration.
 * */
export type DataItemDBDriverConfig<
  ItemType extends TypeInfoDataItem,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  /**
   * Backing table or collection name.
   */
  tableName: string;
  /**
   * Field name used as the unique identifier.
   */
  uniquelyIdentifyingFieldName: UniquelyIdentifyingFieldName;
  /**
   * Optional identifier generator for new items.
   */
  generateUniqueIdentifier?: (targetItem: ItemType) => string;
  /**
   * Optional DB-specific configuration payload.
   */
  dbSpecificConfig?: Record<string, any>;
};

/**
 * The API for a database driver.
 * */
export type DataItemDBDriver<
  ItemType extends TypeInfoDataItem,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  /**
   * Create a new item in the data store.
   * @param newItem New item payload without the identifying field.
   * @returns Generated identifier for the created item.
   */
  createItem: (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ) => Promise<ItemType[UniquelyIdentifyingFieldName]>;
  /**
   * Read an item from the data store.
   * @param uniqueIdentifier Unique identifier value for the item.
   * @param selectedFields Optional fields to select from the item.
   * @returns Item payload (partial when selected fields are used).
   */
  readItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    selectedFields?: (keyof ItemType)[],
  ) => Promise<Partial<ItemType>>;
  /**
   * Update an item in the data store.
   * @param uniqueIdentifier Unique identifier value for the item.
   * @param updatedItem Partial update payload for the item.
   * @returns True when the item was updated.
   */
  updateItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    updatedItem: Partial<ItemType>,
  ) => Promise<boolean>;
  /**
   * Delete an item from the data store.
   * @param uniqueIdentifier Unique identifier value for the item.
   * @returns True when the item was deleted.
   */
  deleteItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<boolean>;
  /**
   * List items from the data store.
   * @param config List configuration and criteria.
   * @param selectedFields Optional fields to select from each item.
   * @returns List results with items and cursor.
   */
  listItems: (
    config: ListItemsConfig,
    selectedFields?: (keyof ItemType)[],
  ) => Promise<ListItemsResults<Partial<ItemType>>>;
};

/**
 * An entry for a supported database driver.
 * */
export type SupportedDataItemDBDriverEntry = {
  /**
   * Factory function for creating a driver instance.
   * @param config Driver configuration.
   * @returns Driver instance.
   */
  factory: <
    ItemType extends Record<any, any>,
    UniquelyIdentifyingFieldName extends keyof ItemType,
  >(
    config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
  ) => DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>;
  /**
   * Return type info describing the DB-specific config.
   * @returns Type info pack for DB-specific config.
   */
  getDBSpecificConfigTypeInfo: () => TypeInfoPack;
};

/**
 * The API for a database driver that handles item relationships.
 * */
export type ItemRelationshipDBDriver = DataItemDBDriver<
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys.id
>;

/**
 * The location information for a file.
 * */
export type BaseFileLocationInfo = {
  /**
   * Optional directory path for the file.
   */
  directory?: string;
  /**
   * File name portion.
   */
  name: string;
};

/**
 * The most integral information about a file.
 * */
export type BaseFile = BaseFileLocationInfo & {
  /**
   * Last updated timestamp in milliseconds.
   */
  updatedOn: number;
  /**
   * MIME type for the file.
   */
  mimeType: string;
  /**
   * File size in bytes.
   */
  sizeInBytes: number;
  /**
   * True when the item represents a directory.
   */
  isDirectory?: boolean;
  /**
   * Optional signed upload URL.
   */
  uploadUrl?: string;
  /**
   * Optional signed download URL.
   */
  downloadUrl?: string;
};

/**
 * The result returned when listing files.
 * */
export type ListFilesResult = {
  /**
   * Cursor string for pagination.
   */
  cursor?: string;
  /**
   * Files returned in the page.
   */
  files: BaseFile[];
};

/**
 * An API for a cloud file service driver.
 * */
export type CloudFileServiceDriver = {
  /**
   * Get a signed URL for uploading a file.
   * @param file File location info.
   * @param baseDirectory Optional base directory prefix.
   * @returns Signed upload URL.
   */
  getFileUploadUrl: (
    file: BaseFileLocationInfo,
    baseDirectory?: string,
  ) => Promise<string>;
  /**
   * Get a signed URL for downloading a file.
   * @param file File location info.
   * @param baseDirectory Optional base directory prefix.
   * @returns Signed download URL.
   */
  getFileDownloadUrl: (
    file: BaseFileLocationInfo,
    baseDirectory?: string,
  ) => Promise<string>;
  /**
   * Delete a file.
   * @param file File location info.
   * @param baseDirectory Optional base directory prefix.
   * @returns Promise resolved once deleted.
   */
  deleteFile: (
    file: BaseFileLocationInfo,
    baseDirectory?: string,
  ) => Promise<void>;
  /**
   * List files in a directory.
   * @param path Optional path prefix to list within.
   * @param baseDirectory Optional base directory prefix.
   * @param maxNumberOfFiles Maximum number of files to return.
   * @param cursor Optional cursor string for pagination.
   * @returns File list and cursor.
   */
  listFiles: (
    path?: string,
    baseDirectory?: string,
    maxNumberOfFiles?: number,
    cursor?: string,
  ) => Promise<ListFilesResult>;
};
