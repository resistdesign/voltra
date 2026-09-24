/**
 * Canonical infrastructure contract for Voltra's unified DynamoDB index table.
 *
 * API drivers and IaC packs share these constants so applications never need
 * to know or repeat Voltra's physical table/index schema.
 */

/** Base-table partition key used by Voltra's unified index table. */
export const VOLTRA_INDEX_TABLE_PARTITION_KEY = "pk";
/** Base-table sort key used by Voltra's unified index table. */
export const VOLTRA_INDEX_TABLE_SORT_KEY = "sk";
/** Logical record-kind attribute used by every persisted index artifact. */
export const VOLTRA_INDEX_TABLE_KIND_ATTRIBUTE = "kind";
/**
 * Canonical DynamoDB GSI used for maintenance enumeration by logical record
 * kind. The IaC pack provisions it and DynamoDB index drivers query it.
 */
export const VOLTRA_INDEX_MAINTENANCE_INDEX_NAME =
  "VoltraIndexMaintenance";
