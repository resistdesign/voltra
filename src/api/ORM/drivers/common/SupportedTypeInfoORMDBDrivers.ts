/**
 * @packageDocumentation
 *
 * Registry of supported Type Info ORM drivers and their selection guidance.
 *
 * Selection notes:
 * - DynamoDB is the default for production item storage with predictable scale.
 * - In-memory drivers are best for tests and ephemeral local workflows.
 * - S3 file drivers are intended for blob/file persistence with key-based access.
 */
import { SupportedDataItemDBDriverEntry } from "./Types";
import { DynamoDBSupportedDataItemDBDriverEntry } from "../DynamoDBDataItemDBDriver";
import { InMemorySupportedDataItemDBDriverEntry } from "../InMemoryDataItemDBDriver";
import { InMemoryFileSupportedDataItemDBDriverEntry } from "../InMemoryFileItemDBDriver";
import { S3SupportedFileItemDBDriverEntry } from "../S3FileItemDBDriver";

/**
 * The supported Type Info ORM DB driver names.
 * */
export enum SupportedTypeInfoORMDBDriverNames {
  /**
   * DynamoDB-backed data item driver.
   */
  DYNAMO_DB_DATA_ITEM = "DYNAMO_DB_DATA_ITEM",
  /**
   * In-memory data item driver.
   */
  IN_MEMORY_DATA_ITEM = "IN_MEMORY_DATA_ITEM",
  /**
   * In-memory file item driver.
   */
  IN_MEMORY_FILE_ITEM = "IN_MEMORY_FILE_ITEM",
  /**
   * S3-backed file item driver.
   */
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
  [SupportedTypeInfoORMDBDriverNames.IN_MEMORY_DATA_ITEM]:
    InMemorySupportedDataItemDBDriverEntry,
  [SupportedTypeInfoORMDBDriverNames.IN_MEMORY_FILE_ITEM]:
    InMemoryFileSupportedDataItemDBDriverEntry,
  [SupportedTypeInfoORMDBDriverNames.S3_FILE_ITEM]:
    S3SupportedFileItemDBDriverEntry,
};
