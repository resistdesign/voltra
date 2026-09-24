/**
 * @packageDocumentation
 *
 * Canonical DynamoDB infrastructure for Voltra's unified index table.
 *
 * Consumers provide the table identity only. Voltra owns the physical key
 * schema and maintenance GSI required by its DynamoDB index drivers.
 */
import {
  VOLTRA_INDEX_MAINTENANCE_INDEX_NAME,
  VOLTRA_INDEX_TABLE_KIND_ATTRIBUTE,
  VOLTRA_INDEX_TABLE_PARTITION_KEY,
  VOLTRA_INDEX_TABLE_SORT_KEY,
} from "../../common/IndexingInfrastructure";
import { SimpleCFT } from "../SimpleCFT";
import { createResourcePack } from "../utils";
import { addDatabase } from "./database";

/** Configuration for the canonical Voltra unified index database. */
export type AddIndexDatabaseConfig = {
  /** CloudFormation logical id for the table. */
  tableId: string;
  /** Optional physical DynamoDB table name. */
  tableName?: string;
  /** DynamoDB billing mode. Defaults to PAY_PER_REQUEST. */
  billingMode?: "PAY_PER_REQUEST" | "PROVISIONED";
};

/**
 * Add the canonical DynamoDB table used by Voltra indexing.
 *
 * The pack owns all physical schema details, including the maintenance GSI
 * required by bounded Health/index enumeration.
 *
 * @param config - Table identity and billing configuration.
 * @group Resource Packs
 */
export const addIndexDatabase = createResourcePack(
  ({
    tableId,
    tableName,
    billingMode = "PAY_PER_REQUEST",
  }: AddIndexDatabaseConfig) =>
    new SimpleCFT()
      .applyPack(addDatabase, {
        tableId,
        tableName,
        billingMode,
        attributes: {
          [VOLTRA_INDEX_TABLE_PARTITION_KEY]: "S",
          [VOLTRA_INDEX_TABLE_SORT_KEY]: "S",
          [VOLTRA_INDEX_TABLE_KIND_ATTRIBUTE]: "S",
        },
        keys: {
          [VOLTRA_INDEX_TABLE_PARTITION_KEY]: "HASH",
          [VOLTRA_INDEX_TABLE_SORT_KEY]: "RANGE",
        },
        globalSecondaryIndexes: [
          {
            indexName: VOLTRA_INDEX_MAINTENANCE_INDEX_NAME,
            keys: {
              [VOLTRA_INDEX_TABLE_KIND_ATTRIBUTE]: "HASH",
              [VOLTRA_INDEX_TABLE_PARTITION_KEY]: "RANGE",
            },
            projection: "KEYS_ONLY",
          },
        ],
      })
      .toJSON(),
);
