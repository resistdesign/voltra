import { SupportedDataItemDBDriverEntry } from "../Types";
import { DynamoDBSupportedDataItemDBDriverEntry } from "./DynamoDBDataItemDBDriver";
import { S3SupportedFileItemDBDriverEntry } from "./S3FileItemDBDriver";

/**
 * The supported DB driver names.
 * */
export enum SupportedDBDriverNames {
  DYNAMO_DB_DATA_ITEM = "DYNAMO_DB_DATA_ITEM",
  S3_FILE_ITEM = "S3_FILE_ITEM",
}

/**
 * A map of supported Type Info ORM DB drivers by name.
 * */
export const SUPPORTED_TYPE_INFO_ORM_DB_DRIVERS: Record<
  SupportedDBDriverNames,
  SupportedDataItemDBDriverEntry
> = {
  [SupportedDBDriverNames.DYNAMO_DB_DATA_ITEM]:
    DynamoDBSupportedDataItemDBDriverEntry,
  [SupportedDBDriverNames.S3_FILE_ITEM]: S3SupportedFileItemDBDriverEntry,
};
