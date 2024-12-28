import { SupportedDataItemDBDriverEntry } from "../Types";
import { DynamoDBSupportedDataItemDBDriverEntry } from "./DynamoDBDataItemDBDriver";
import { S3SupportedDataItemDBDriverEntry } from "./S3DataItemDBDriver";

/**
 * The supported DB driver names.
 * */
export enum SupportedDBDriverNames {
  DYNAMO_DB = "DYNAMO_DB",
  S3 = "S3",
}

/**
 * A map of supported DB drivers by name.
 * */
export const SUPPORTED_DB_DRIVERS: Record<
  SupportedDBDriverNames,
  SupportedDataItemDBDriverEntry
> = {
  [SupportedDBDriverNames.DYNAMO_DB]: DynamoDBSupportedDataItemDBDriverEntry,
  [SupportedDBDriverNames.S3]: S3SupportedDataItemDBDriverEntry,
};
