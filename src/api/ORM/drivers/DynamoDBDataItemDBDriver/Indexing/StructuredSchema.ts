import {
  INDEX_TABLE_KIND_ATTRIBUTE,
  INDEX_TABLE_PARTITION_KEY,
  INDEX_TABLE_SORT_KEY,
} from "./IndexTable";

/** DynamoDB attribute schema for structured term records. */
export const structuredTermIndexSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  fieldAttribute: "field",
  valueAttribute: "value",
  modeAttribute: "mode",
} as const;

/** DynamoDB attribute schema for structured range records. */
export const structuredRangeIndexSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  valueAttribute: "value",
  docIdAttribute: "docId",
} as const;

/** DynamoDB attribute schema for structured document state. */
export const structuredDocFieldsSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  fieldsAttribute: "fields",
  versionAttribute: "version",
} as const;
