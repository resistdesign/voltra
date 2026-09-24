/**
 * DynamoDB-specific physical index table constraints and configuration.
 */
import type { IndexTableKey } from "../../../../Indexing/IndexTable";

/** DynamoDB partition-key maximum size in UTF-8 bytes. */
export const INDEX_PARTITION_KEY_MAX_BYTES = 2048;
/** DynamoDB sort-key maximum size in UTF-8 bytes. */
export const INDEX_SORT_KEY_MAX_BYTES = 1024;

/** DynamoDB storage configuration for Voltra's unified index records. */
export type DynamoIndexTableConfig = {
  /** DynamoDB table name used by this indexing driver. */
  tableName: string;
};

/**
 * Backward-compatible Dynamo driver alias.
 *
 * @deprecated Prefer {@link DynamoIndexTableConfig}.
 */
export type IndexTableConfig = DynamoIndexTableConfig;

const utf8Length = (value: string): number =>
  new TextEncoder().encode(value).length;

/** Assert a deployment supplied a usable DynamoDB index table name. */
export const assertIndexTableConfig = (
  config: DynamoIndexTableConfig,
): void => {
  if (typeof config?.tableName !== "string" || config.tableName.trim() === "") {
    throw new Error("Missing table name for indexing.tableName.");
  }

};

/** Validate a logical Voltra index key against DynamoDB physical limits. */
export const assertDynamoIndexTableKey = (
  key: IndexTableKey,
): IndexTableKey => {
  if (utf8Length(key.pk) > INDEX_PARTITION_KEY_MAX_BYTES) {
    throw new Error(
      `Index partition key exceeds ${INDEX_PARTITION_KEY_MAX_BYTES} UTF-8 bytes for DynamoDB.`,
    );
  }
  if (utf8Length(key.sk) > INDEX_SORT_KEY_MAX_BYTES) {
    throw new Error(
      `Index sort key exceeds ${INDEX_SORT_KEY_MAX_BYTES} UTF-8 bytes for DynamoDB.`,
    );
  }
  return key;
};

/** Validate one logical partition key against DynamoDB physical limits. */
export const assertDynamoIndexPartitionKey = (value: string): string => {
  assertDynamoIndexTableKey({ pk: value, sk: "" });
  return value;
};

/** Validate one logical sort key against DynamoDB physical limits. */
export const assertDynamoIndexSortKey = (value: string): string => {
  assertDynamoIndexTableKey({ pk: "", sk: value });
  return value;
};
