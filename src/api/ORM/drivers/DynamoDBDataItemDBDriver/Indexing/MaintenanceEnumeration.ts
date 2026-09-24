/**
 * DynamoDB-specific maintenance enumeration helpers for the unified index table.
 *
 * Voltra owns the required maintenance GSI contract. Bounded maintenance
 * queries one logical record family directly instead of scanning unrelated
 * index artifacts.
 */
import {
  INDEX_TABLE_KIND_ATTRIBUTE,
  INDEX_TABLE_PARTITION_KEY,
  INDEX_TABLE_SORT_KEY,
  type IndexItemKind,
} from "../../../../Indexing/IndexTable";
import { VOLTRA_INDEX_MAINTENANCE_INDEX_NAME } from "../../../../../common/IndexingInfrastructure";
import type {
  AttributeMap,
  DynamoQueryClient,
  KeysAndAttributes,
} from "./Types";
import type { IndexTableConfig } from "./IndexTable";

const BATCH_GET_LIMIT = 100;
const BATCH_GET_MAX_ATTEMPTS = 8;

const keyFromItem = (item: AttributeMap): AttributeMap | undefined => {
  const pk = item[INDEX_TABLE_PARTITION_KEY];
  const sk = item[INDEX_TABLE_SORT_KEY];

  if (typeof pk !== "string" || typeof sk !== "string") {
    return undefined;
  }

  return {
    [INDEX_TABLE_PARTITION_KEY]: pk,
    [INDEX_TABLE_SORT_KEY]: sk,
  };
};

const keyIdentity = (item: AttributeMap): string | undefined => {
  const key = keyFromItem(item);

  return key
    ? JSON.stringify([
        key[INDEX_TABLE_PARTITION_KEY],
        key[INDEX_TABLE_SORT_KEY],
      ])
    : undefined;
};

const hydrateKeysStrongly = async (
  client: DynamoQueryClient,
  tableName: string,
  keys: AttributeMap[],
): Promise<AttributeMap[]> => {
  const hydratedByKey = new Map<string, AttributeMap>();

  for (let offset = 0; offset < keys.length; offset += BATCH_GET_LIMIT) {
    const chunk = keys.slice(offset, offset + BATCH_GET_LIMIT);
    let pending: Record<string, KeysAndAttributes> | undefined = {
      [tableName]: {
        Keys: chunk,
        ConsistentRead: true,
      },
    };

    for (
      let attempt = 0;
      (pending?.[tableName]?.Keys.length ?? 0) > 0 &&
      attempt < BATCH_GET_MAX_ATTEMPTS;
      attempt += 1
    ) {
      const requestItems = pending;
      if (!requestItems) {
        break;
      }

      const response = await client.batchGetItem({
        RequestItems: requestItems,
      });

      for (const item of response.Responses?.[tableName] ?? []) {
        const identity = keyIdentity(item);
        if (identity) {
          hydratedByKey.set(identity, item);
        }
      }

      pending = response.UnprocessedKeys;
    }

    const remainingKeys = pending?.[tableName]?.Keys ?? [];
    for (const key of remainingKeys) {
      const response = await client.getItem({
        TableName: tableName,
        Key: key,
        ConsistentRead: true,
      });
      const identity = response.Item ? keyIdentity(response.Item) : undefined;
      if (identity && response.Item) {
        hydratedByKey.set(identity, response.Item);
      }
    }
  }

  return keys
    .map((key) => {
      const identity = keyIdentity(key);
      return identity ? hydratedByKey.get(identity) : undefined;
    })
    .filter((item): item is AttributeMap => !!item);
};

/** Options for one bounded logical-kind maintenance page. */
export type DynamoMaintenanceKindListOptions = {
  client: DynamoQueryClient;
  table: IndexTableConfig;
  kind: IndexItemKind;
  cursor?: AttributeMap;
  limit: number;
  /**
   * Load full records from the base table after querying the KEYS_ONLY GSI.
   * Strong base-table reads preserve existing maintenance verification behavior.
   */
  hydrateBaseItems?: boolean;
};

/** One bounded page returned by logical-kind maintenance enumeration. */
export type DynamoMaintenanceKindPage = {
  items: AttributeMap[];
  cursor?: AttributeMap;
};

/**
 * Enumerate one logical unified-index record family through Voltra's canonical
 * maintenance GSI.
 */
export const listDynamoIndexItemsByKind = async (
  options: DynamoMaintenanceKindListOptions,
): Promise<DynamoMaintenanceKindPage> => {
  const {
    client,
    table,
    kind,
    cursor,
    limit,
    hydrateBaseItems = false,
  } = options;
  const response = await client.query({
    TableName: table.tableName,
    IndexName: VOLTRA_INDEX_MAINTENANCE_INDEX_NAME,
    KeyConditionExpression: "#kind = :kind",
    ExpressionAttributeNames: {
      "#kind": INDEX_TABLE_KIND_ATTRIBUTE,
    },
    ExpressionAttributeValues: {
      ":kind": kind,
    },
    ExclusiveStartKey: cursor,
    Limit: Math.max(1, limit),
    ScanIndexForward: true,
  });
  const indexedItems = response.Items ?? [];

  return {
    items: hydrateBaseItems
      ? await hydrateKeysStrongly(
          client,
          table.tableName,
          indexedItems
            .map((item) => keyFromItem(item))
            .filter((key): key is AttributeMap => !!key),
        )
      : indexedItems,
    cursor: response.LastEvaluatedKey,
  };
};  }

  if (!client.scan) {
    throw new Error(
      "DynamoDB maintenance enumeration requires either maintenanceIndexName or scan support.",
    );
  }

  const response = await client.scan({
    TableName: table.tableName,
    FilterExpression: "#kind = :kind",
    ExpressionAttributeNames: {
      "#kind": INDEX_TABLE_KIND_ATTRIBUTE,
    },
    ExpressionAttributeValues: {
      ":kind": kind,
    },
    ExclusiveStartKey: cursor,
    Limit: boundedLimit,
    ConsistentRead: true,
  });

  return {
    items: response.Items ?? [],
    cursor: response.LastEvaluatedKey,
    strategy: "scan",
  };
};
