import { SupportedDataItemDBDriverEntry } from "./Types";
import { DynamoDBSupportedDataItemDBDriverEntry } from "../DynamoDBDataItemDBDriver";
import { S3SupportedFileItemDBDriverEntry } from "../S3FileItemDBDriver";

/**
 * The supported Type Info ORM DB driver names.
 * */
export enum SupportedTypeInfoORMDBDriverNames {
  DYNAMO_DB_DATA_ITEM = "DYNAMO_DB_DATA_ITEM",
  S3_FILE_ITEM = "S3_FILE_ITEM",
}

/**
 * A map of supported Type Info ORM DB drivers by name.
 * */
export const SUPPORTED_TYPE_INFO_ORM_DB_DRIVERS: Record<
  SupportedTypeInfoORMDBDriverNames,
  SupportedDataItemDBDriverEntry
> = {
  [SupportedTypeInfoORMDBDriverNames.DYNAMO_DB_DATA_ITEM]:
    DynamoDBSupportedDataItemDBDriverEntry,
  [SupportedTypeInfoORMDBDriverNames.S3_FILE_ITEM]:
    S3SupportedFileItemDBDriverEntry,
};
