import {
  ItemRelationshipInfo,
  ListItemsConfig,
  ListItemsResults,
} from "../../../common";

/**
 * A basic API for a database driver with CRUD and Find.
 * */
export interface IBasicDatabaseDriver {
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
}

/**
 * A driver for a database service.
 * */
export type DBServiceItemDriver<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  createItem: (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ) => Promise<ItemType[UniquelyIdentifyingFieldName]>;
  readItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<ItemType>;
  updateItem: (updatedItem: Partial<ItemType>) => Promise<boolean>;
  deleteItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<boolean>;
  listItems: (
    config: ListItemsConfig,
  ) => Promise<boolean | ListItemsResults<ItemType>>;
};

/**
 * A driver for a database service that handles relationship items.
 * */
export type DBRelatedItemDriver = DBServiceItemDriver<
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
 * A driver for a file service.
 * */
export type FileServiceDriver = {
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
