import { TypeInfoPack } from "../../../../common/TypeParsing/TypeInfo";
import {
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys,
} from "../../../../common/ItemRelationshipInfoTypes";
import {
  ListItemsConfig,
  ListItemsResults,
} from "../../../../common/SearchTypes";
import type {
  TypeInfoORMCreateConfig,
  TypeInfoORMReadConfig,
  TypeInfoORMUpdateConfig,
} from "../../../../common/TypeInfoORM/Types";

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
  /**
   * Update operator is not supported by the driver.
   */
  UPDATE_OPERATOR_NOT_SUPPORTED = "UPDATE_OPERATOR_NOT_SUPPORTED",
}

/**
 * The generic type for a database driver configuration.
 * */
export type DataItemDBDriverConfig<
  ItemType extends Record<string, any>,
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
 * Server-only requirements on an existing CRUD operation. Drivers must exclude
 * ALL competing canonical mutations of this identity through callback completion,
 * including unconfigured/direct writes. Refuse before side effects if impossible.
 * Images are detached full canonical values; undefined means absence. Callbacks
 * must not recursively mutate or request coordinated reads from the same store.
 * Ordinary reads may inspect current state. A coordinated read invokes inspect
 * even for absence, then retains normal ITEM_NOT_FOUND behavior.
 */
export type DataItemOperationConfig<ItemType> = {
  /** Generic authorization/index work executed within driver-owned exclusion. */
  coordination?: {
    /** Inspect exact state before conditions/commit; rejection prevents mutation. */
    inspect?: (current: ItemType | undefined) => Promise<void>;
    /** Maintain indexes after commit, before another canonical writer can run. */
    changed?: (
      before: ItemType | undefined,
      after: ItemType | undefined,
    ) => Promise<void>;
  };
};

/** A canonical write committed, but its coordinated follow-up failed. No rollback. */
export class CanonicalWriteCommittedError extends Error {
  /** Canonical state changed even though coordinated follow-up failed. */
  readonly canonicalCommitted = true;

  /** Preserve the follow-up failure without exposing canonical images to callers. */
  constructor(cause: unknown) {
    super("CANONICAL_WRITE_COMMITTED", { cause });
    this.name = "CanonicalWriteCommittedError";
  }
}

/**
 * The API for a database driver.
 * */
export type DataItemDBDriver<
  ItemType extends Record<string, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  /**
   * Create an item, atomically refusing an occupied identity when ifAbsent is set.
   * Unsupported drivers must refuse the requirement, never ignore it.
   * @returns Generated identifier for the created item.
   */
  createItem(
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
    createConfig?: TypeInfoORMCreateConfig & DataItemOperationConfig<ItemType>,
  ): Promise<ItemType[UniquelyIdentifyingFieldName]>;
  /**
   * Read an item from the data store.
   * @param uniqueIdentifier Unique identifier value for the item.
   * @param selectedFields Optional fields to select from the item.
   * @param readConfig Required consistency; unsupported guarantees must be refused.
   * @returns Item payload (partial when selected fields are used).
   */
  readItem(
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    selectedFields?: (keyof ItemType)[],
    readConfig?: TypeInfoORMReadConfig & DataItemOperationConfig<ItemType>,
  ): Promise<Partial<ItemType>>;
  /**
   * Update an item in the data store.
   * Atomically enforce supplied preconditions, requiring an existing target.
   * Unsupported drivers must refuse guards. A failed guard throws
   * CONDITIONAL_WRITE_CONFLICT or returns false; the ORM normalizes false.
   * Coordination requirements must be honored or refused before side effects.
   * @param uniqueIdentifier Unique identifier value for the item.
   * @param updatedItem Partial update payload for the item.
   * @returns True when the item was updated.
   */
  updateItem(
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    updatedItem: Partial<ItemType>,
    updateConfig?: TypeInfoORMUpdateConfig & DataItemOperationConfig<ItemType>,
  ): Promise<boolean>;
  /**
   * Delete an item from the data store.
   * @param uniqueIdentifier Unique identifier value for the item.
   * @returns True when the item was deleted.
   */
  deleteItem(
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    deleteConfig?: DataItemOperationConfig<ItemType>,
  ): Promise<boolean>;
  /**
   * List items from the data store.
   * @param config List configuration and criteria.
   * @param selectedFields Optional fields to select from each item.
   * @returns List results with items and cursor.
   */
  listItems(
    config: ListItemsConfig,
    selectedFields?: (keyof ItemType)[],
  ): Promise<ListItemsResults<Partial<ItemType>>>;
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
