import { SupportedDataItemDBDriverEntry } from "../Types";
import { DynamoDBSupportedDataItemDBDriverEntry } from "./DynamoDBDataItemDBDriver";

export enum SupportedDBDriverNames {
  DYNAMO_DB = "DYNAMO_DB",
}

export const SUPPORTED_DB_DRIVERS: Record<
  SupportedDBDriverNames,
  SupportedDataItemDBDriverEntry
> = {
  [SupportedDBDriverNames.DYNAMO_DB]: DynamoDBSupportedDataItemDBDriverEntry,
};
