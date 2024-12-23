import {
  ItemRelationshipInfo,
  ListItemsConfig,
  ListItemsResults,
} from "../../../common";

/**
 * The basic API for a database driver with CRUD and Find.
 * */
export type BasicDBDriver = {
  /**
   * Create an item in the database.
   * */
  createItem: (
    type: string,
    id: string,
    item: Record<string, string>,
  ) => Promise<void>;
  /**
   * Read an item from the database.
   * */
  readItem: (
    type: string,
    id: string,
    getProperties?: string[],
  ) => Promise<Record<string, string>>;
  /**
   * Update an item in the database.
   * */
  updateItem: (
    type: string,
    id: string,
    item: Record<string, string | null>,
  ) => Promise<void>;
  /**
   * Delete an item from the database.
   * */
  deleteItem: (type: string, id: string) => Promise<void>;
  /**
   * List items in the database.
   * */
  findItems: (
    type: string,
    properties: string[],
    value: string,
    getProperties?: string[],
  ) => Promise<Record<string, string>[]>;
};

/**
 * The API for a database driver.
 * */
export type DataItemDBDriver<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  createItem: (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ) => Promise<ItemType[UniquelyIdentifyingFieldName]>;
  // TODO: Specific fields.
  readItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<ItemType>;
  updateItem: (updatedItem: Partial<ItemType>) => Promise<boolean>;
  deleteItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<boolean>;
  // TODO: Specific fields.
  listItems: (
    config: ListItemsConfig,
  ) => Promise<boolean | ListItemsResults<ItemType>>;
};

/**
 * The API for a database driver that handles item relationships.
 * */
export type ItemRelationshipDBDriver = DataItemDBDriver<
  ItemRelationshipInfo,
  "id"
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
