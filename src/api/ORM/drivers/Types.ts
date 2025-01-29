import {
  ItemRelationshipInfo,
  ListItemsConfig,
  ListItemsResults,
} from "../../../common";
import {
  TypeInfoDataItem,
  TypeInfoPack,
} from "../../../common/TypeParsing/TypeInfo";
import { ItemRelationshipInfoIdentifyingKeys } from "../../../common/ItemRelationshipInfo";

/**
 * The errors that can be thrown by a {@link DataItemDBDriver}.
 * */
export enum DATA_ITEM_DB_DRIVER_ERRORS {
  MISSING_ID = "MISSING_ID",
  INVALID_CURSOR = "INVALID_CURSOR",
  ITEM_NOT_FOUND = "ITEM_NOT_FOUND",
  MISSING_UNIQUE_IDENTIFIER = "MISSING_UNIQUE_IDENTIFIER",
  SEARCH_COMPARISON_OPERATOR_NOT_SUPPORTED = "SEARCH_COMPARISON_OPERATOR_NOT_SUPPORTED",
}

/**
 * The generic type for a database driver configuration.
 * */
export type DataItemDBDriverConfig<
  ItemType extends TypeInfoDataItem,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  tableName: string;
  uniquelyIdentifyingFieldName: UniquelyIdentifyingFieldName;
  generateUniqueIdentifier?: (targetItem: ItemType) => string;
  dbSpecificConfig?: Record<string, any>;
};

/**
 * The API for a database driver.
 * */
export type DataItemDBDriver<
  ItemType extends TypeInfoDataItem,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  createItem: (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ) => Promise<ItemType[UniquelyIdentifyingFieldName]>;
  readItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    selectedFields?: (keyof ItemType)[],
  ) => Promise<Partial<ItemType>>;
  updateItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    updatedItem: Partial<ItemType>,
  ) => Promise<boolean>;
  deleteItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<boolean>;
  listItems: (
    config: ListItemsConfig,
    selectedFields?: (keyof ItemType)[],
  ) => Promise<ListItemsResults<Partial<ItemType>>>;
};

/**
 * An entry for a supported database driver.
 * */
export type SupportedDataItemDBDriverEntry = {
  factory: <
    ItemType extends Record<any, any>,
    UniquelyIdentifyingFieldName extends keyof ItemType,
  >(
    config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
  ) => DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>;
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
  directory?: string;
  name: string;
};

/**
 * The most integral information about a file.
 * */
export type BaseFile = BaseFileLocationInfo & {
  updatedOn: number;
  mimeType: string;
  sizeInBytes: number;
  isDirectory?: boolean;
  uploadUrl?: string;
  downloadUrl?: string;
};

/**
 * The result returned when listing files.
 * */
export type ListFilesResult = {
  cursor?: string;
  files: BaseFile[];
};

/**
 * An API for a cloud file service driver.
 * */
export type CloudFileServiceDriver = {
  getFileUploadUrl: (
    file: BaseFileLocationInfo,
    baseDirectory?: string,
  ) => Promise<string>;
  getFileDownloadUrl: (
    file: BaseFileLocationInfo,
    baseDirectory?: string,
  ) => Promise<string>;
  deleteFile: (
    file: BaseFileLocationInfo,
    baseDirectory?: string,
  ) => Promise<void>;
  listFiles: (
    path?: string,
    baseDirectory?: string,
    maxNumberOfFiles?: number,
    cursor?: string,
  ) => Promise<ListFilesResult>;
};
