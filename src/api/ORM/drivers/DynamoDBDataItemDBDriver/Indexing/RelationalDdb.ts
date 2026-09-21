/**
 * @packageDocumentation
 *
 * DynamoDB backend for relational edges. Stores each edge twice (out/in) to
 * support directional traversal with cursor-based paging.
 */
import { IndexMutationCoordinator } from "./IndexMutationCoordinator";
import type { DynamoQueryClient, WriteRequest } from "./Types";
import {
  INDEX_ITEM_KINDS,
  INDEX_KEY_PARTS,
  buildIndexScalarKey,
  encodeIndexScalarIdentity,
  type IndexTableKey,
} from "../../../../Indexing/IndexTable";
import {
  INDEX_TABLE_KIND_ATTRIBUTE,
  INDEX_TABLE_PARTITION_KEY,
  INDEX_TABLE_SORT_KEY,
} from "../../../../Indexing/IndexTable";
import {
  assertDynamoIndexTableKey,
  assertIndexTableConfig,
  type IndexTableConfig,
} from "./IndexTable";
import {
  RelationalIndexBackend,
  type RelationalIndexStorage,
  type RelationalStorageKey,
  type RelationalStorageRecord,
} from "../../../../Indexing/rel/RelationalIndexBackend";
import type { Direction } from "../../../../Indexing/rel/Types";

type EdgeMetadata = Record<string, unknown>;

/**
 * DynamoDB key shape for relation edges.
 */
export type RelationEdgesDdbKey = IndexTableKey;

/**
 * DynamoDB item shape for relation edges.
 */
export type RelationEdgesDdbItem<
  TMetadata extends EdgeMetadata = EdgeMetadata,
> = RelationEdgesDdbKey & {
  /** Logical item kind in the shared physical table. */
  kind: typeof INDEX_ITEM_KINDS.relationshipEdge;
  /** Opposite entity id for consumer-facing edge reconstruction. */
  otherId: string;
  /**
   * Optional metadata stored with the edge.
   */
  metadata?: TMetadata;
};

/**
 * Schema metadata for relational edges stored in DynamoDB.
 */
export const relationEdgesSchema = {
  partitionKey: INDEX_TABLE_PARTITION_KEY,
  sortKey: INDEX_TABLE_SORT_KEY,
  kindAttribute: INDEX_TABLE_KIND_ATTRIBUTE,
  metadataAttribute: "metadata",
} as const;

/**
 * @deprecated Use {@link IndexTableConfig}. Relationship edges share the index table.
 */
export type RelationsTableNames = IndexTableConfig;

/**
 * Configuration for relational DynamoDB backends.
 *
 * Table names are required and should be injected per deployment.
 */
export type RelationsDdbConfig = {
  client: DynamoQueryClient;
  table: IndexTableConfig;
  batchSize?: number;
  /** Shared coordinator for compatible derived writes. */
  mutationCoordinator?: IndexMutationCoordinator;
};

type TableWrite = {
  tableName: string;
  request: WriteRequest;
};

const chunkRequests = (
  requests: TableWrite[],
  size: number,
): TableWrite[][] => {
  const chunks: TableWrite[][] = [];
  for (let index = 0; index < requests.length; index += size) {
    chunks.push(requests.slice(index, index + size));
  }
  return chunks;
};

export const createRelationEdgesDdbDependencies = <
  TMetadata extends EdgeMetadata = EdgeMetadata,
>(
  config: RelationsDdbConfig,
): RelationEdgesDdbDependencies<TMetadata> => {
  assertIndexTableConfig(config.table);
  const tableName = config.table.tableName;
  const batchSize = config.batchSize ?? 25;
  const mutationCoordinator =
    config.mutationCoordinator ?? new IndexMutationCoordinator(config.client);

  return {
    putEdges: async (items) => {
      const writes = items.map<TableWrite>((item) => ({
        tableName,
        request: { PutRequest: { Item: item as Record<string, unknown> } },
      }));
      const chunks = chunkRequests(writes, batchSize);
      for (const chunk of chunks) {
        await mutationCoordinator.write(chunk);
      }
    },
    deleteEdges: async (keys) => {
      const writes = keys.map<TableWrite>((key) => ({
        tableName,
        request: { DeleteRequest: { Key: key as Record<string, unknown> } },
      }));
      const chunks = chunkRequests(writes, batchSize);
      for (const chunk of chunks) {
        await mutationCoordinator.write(chunk);
      }
    },
    queryEdges: async ({ edgeKey, limit, exclusiveStartKey }) => {
      const response = await config.client.query({
        TableName: tableName,
        KeyConditionExpression: "#edgeKey = :edgeKey",
        ExpressionAttributeNames: {
          "#edgeKey": relationEdgesSchema.partitionKey,
        },
        ExpressionAttributeValues: {
          ":edgeKey": edgeKey,
        },
        ExclusiveStartKey: exclusiveStartKey
          ? (exclusiveStartKey as Record<string, unknown>)
          : undefined,
        Limit: limit,
      });

      return {
        items: (response.Items ?? []) as RelationEdgesDdbItem<TMetadata>[],
        lastEvaluatedKey: response.LastEvaluatedKey as
          RelationEdgesDdbKey | undefined,
      };
    },
  };
};

/**
 * Encode the partition key for relation edges.
 * @param entityId Source/target entity id.
 * @param relation Relation name.
 * @param direction Traversal direction.
 * @returns Encoded partition key for the relation edge.
 */
export function encodeRelationEdgePartitionKey(
  entityId: string,
  relation: string,
  direction: Direction,
): string {
  return buildIndexScalarKey(
    INDEX_ITEM_KINDS.relationshipEdge,
    "entity",
    entityId,
    relation,
    direction,
  );
}

/**
 * Build a DynamoDB key for a relation edge.
 * @param entityId Source/target entity id.
 * @param relation Relation name.
 * @param direction Traversal direction.
 * @param otherId Opposite entity id for the edge.
 * @returns Relation edge key for DynamoDB.
 */
export function buildRelationEdgeDdbKey(
  entityId: string,
  relation: string,
  direction: Direction,
  otherId: string,
): RelationEdgesDdbKey {
  return assertDynamoIndexTableKey({
    pk: encodeRelationEdgePartitionKey(entityId, relation, direction),
    sk: `${INDEX_KEY_PARTS.entity}#${encodeIndexScalarIdentity(otherId)}`,
  });
}

/**
 * Build a DynamoDB item for a relation edge.
 * @param entityId Source/target entity id.
 * @param relation Relation name.
 * @param direction Traversal direction.
 * @param otherId Opposite entity id for the edge.
 * @param metadata Optional metadata for the edge.
 * @returns Relation edge item for DynamoDB.
 */
export function buildRelationEdgeDdbItem<TMetadata extends EdgeMetadata>(
  entityId: string,
  relation: string,
  direction: Direction,
  otherId: string,
  metadata?: TMetadata,
): RelationEdgesDdbItem<TMetadata> {
  return {
    ...buildRelationEdgeDdbKey(entityId, relation, direction, otherId),
    kind: INDEX_ITEM_KINDS.relationshipEdge,
    otherId,
    ...(metadata !== undefined ? { metadata } : {}),
  };
}

/**
 * Query request for relation edges.
 */
export type RelationEdgesQueryRequest = {
  /**
   * Partition key for the relation edge query.
   */
  edgeKey: string;
  /**
   * Optional maximum number of items to return.
   */
  limit?: number;
  /**
   * Optional exclusive start key for pagination.
   */
  exclusiveStartKey?: RelationEdgesDdbKey;
};

/**
 * Query results for relation edges.
 */
export type RelationEdgesQueryResult<
  TMetadata extends EdgeMetadata = EdgeMetadata,
> = {
  /**
   * Returned items for the query.
   */
  items: RelationEdgesDdbItem<TMetadata>[];
  /**
   * Last evaluated key for pagination.
   */
  lastEvaluatedKey?: RelationEdgesDdbKey;
};

/**
 * DynamoDB dependencies required for relation edge storage.
 */
export type RelationEdgesDdbDependencies<
  TMetadata extends EdgeMetadata = EdgeMetadata,
> = {
  /**
   * Batch put relation edge items.
   * @param items Edge items to store.
   * @returns Promise resolved once stored.
   */
  putEdges(items: RelationEdgesDdbItem<TMetadata>[]): Promise<void>;
  /**
   * Batch delete relation edge keys.
   * @param keys Edge keys to delete.
   * @returns Promise resolved once deleted.
   */
  deleteEdges(keys: RelationEdgesDdbKey[]): Promise<void>;
  /**
   * Query relation edges by key.
   * @param request Query request parameters.
   * @returns Query results and pagination key.
   */
  queryEdges(
    request: RelationEdgesQueryRequest,
  ): Promise<RelationEdgesQueryResult<TMetadata>>;
};

type RelationEdgesCursorToken = RelationEdgesDdbKey;

function encodeRelationEdgesToken(
  key?: RelationEdgesDdbKey,
): string | undefined {
  if (!key) {
    return undefined;
  }

  return JSON.stringify(key);
}

function decodeRelationEdgesToken(
  token?: string,
): RelationEdgesCursorToken | undefined {
  if (!token) {
    return undefined;
  }

  const parsed = JSON.parse(token) as Partial<RelationEdgesCursorToken>;

  if (typeof parsed.pk !== "string" || typeof parsed.sk !== "string") {
    throw new Error("Invalid relation edges cursor token.");
  }

  return { pk: parsed.pk, sk: parsed.sk };
}

/**
 * Adapt DynamoDB IO to Voltra's generic relational storage contract.
 */
const createRelationalDdbStorage = <
  TMetadata extends EdgeMetadata = EdgeMetadata,
>(
  dependencies: RelationEdgesDdbDependencies<TMetadata>,
): RelationalIndexStorage<TMetadata> => ({
  put: async (records: Array<RelationalStorageRecord<TMetadata>>) => {
    await dependencies.putEdges(
      records.map((record) =>
        buildRelationEdgeDdbItem(
          record.entityId,
          record.relation,
          record.direction,
          record.otherId,
          record.metadata,
        ),
      ),
    );
  },
  delete: async (keys: RelationalStorageKey[]) => {
    await dependencies.deleteEdges(
      keys.map((key) =>
        buildRelationEdgeDdbKey(
          key.entityId,
          key.relation,
          key.direction,
          key.otherId,
        ),
      ),
    );
  },
  query: async (query) => {
    const result = await dependencies.queryEdges({
      edgeKey: encodeRelationEdgePartitionKey(
        query.entityId,
        query.relation,
        query.direction,
      ),
      limit: query.limit,
      exclusiveStartKey: query.lastId
        ? buildRelationEdgeDdbKey(
            query.entityId,
            query.relation,
            query.direction,
            query.lastId,
          )
        : decodeRelationEdgesToken(query.continuationToken),
    });

    return {
      records: result.items.map((item) => ({
        entityId: query.entityId,
        relation: query.relation,
        direction: query.direction,
        otherId: item.otherId,
        ...(item.metadata !== undefined ? { metadata: item.metadata } : {}),
      })),
      continuationToken: encodeRelationEdgesToken(result.lastEvaluatedKey),
    };
  },
});

/**
 * DynamoDB IO wrapper around the generic relational indexing strategy.
 */
export class RelationalDdbBackend<
  TMetadata extends EdgeMetadata = EdgeMetadata,
> extends RelationalIndexBackend<TMetadata> {
  constructor(dependencies: RelationEdgesDdbDependencies<TMetadata>) {
    super(createRelationalDdbStorage(dependencies));
  }
}
