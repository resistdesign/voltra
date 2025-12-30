/**
 * @packageDocumentation
 *
 * DynamoDB backend for relational edges. Stores each edge twice (out/in) to
 * support directional traversal with cursor-based paging.
 */
import { decodeRelationalCursor, encodeRelationalCursor } from "./cursor";
import type { Direction, Edge, EdgeKey, EdgePage, RelationalQueryOptions } from "./types";

type EdgeMetadata = Record<string, unknown>;

/**
 * DynamoDB key shape for relation edges.
 */
export type RelationEdgesDdbKey = {
  /**
   * Partition key encoding entity/relation/direction.
   */
  edgeKey: string;
  /**
   * Sort key identifying the opposite entity id.
   */
  otherId: string;
};

/**
 * DynamoDB item shape for relation edges.
 */
export type RelationEdgesDdbItem<TMetadata extends EdgeMetadata = EdgeMetadata> = RelationEdgesDdbKey & {
  /**
   * Optional metadata stored with the edge.
   */
  metadata?: TMetadata;
};

/**
 * Schema metadata for relational edges stored in DynamoDB.
 */
export const relationEdgesSchema = {
  tableName: 'RelationEdges',
  partitionKey: 'edgeKey',
  sortKey: 'otherId',
  metadataAttribute: 'metadata',
} as const;

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
  return `${entityId}\u0000${relation}\u0000${direction}`;
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
  return {
    edgeKey: encodeRelationEdgePartitionKey(entityId, relation, direction),
    otherId,
  };
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
    metadata,
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
export type RelationEdgesQueryResult<TMetadata extends EdgeMetadata = EdgeMetadata> = {
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
export type RelationEdgesDdbDependencies<TMetadata extends EdgeMetadata = EdgeMetadata> = {
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
  queryEdges(request: RelationEdgesQueryRequest): Promise<RelationEdgesQueryResult<TMetadata>>;
};

type RelationEdgesCursorToken = {
  edgeKey: string;
  otherId: string;
};

function encodeRelationEdgesToken(key?: RelationEdgesDdbKey): string | undefined {
  if (!key) {
    return undefined;
  }

  return JSON.stringify(key);
}

function decodeRelationEdgesToken(token?: string): RelationEdgesCursorToken | undefined {
  if (!token) {
    return undefined;
  }

  const parsed = JSON.parse(token) as Partial<RelationEdgesCursorToken>;

  if (typeof parsed.edgeKey !== 'string' || typeof parsed.otherId !== 'string') {
    throw new Error('Invalid relation edges cursor token.');
  }

  return { edgeKey: parsed.edgeKey, otherId: parsed.otherId };
}

/**
 * DynamoDB-backed relational edge store with directional queries.
 */
export class RelationalDdbBackend<TMetadata extends EdgeMetadata = EdgeMetadata> {
  /**
   * @param dependencies DynamoDB query/write dependencies.
   */
  constructor(private readonly dependencies: RelationEdgesDdbDependencies<TMetadata>) {}

  /**
   * Insert or update an edge.
   * @param edge Edge to store.
   * @returns Promise resolved once stored.
   */
  async putEdge(edge: Edge<TMetadata>): Promise<void> {
    const { from, to, relation } = edge.key;
    const forwardItem = buildRelationEdgeDdbItem(from, relation, 'out', to, edge.metadata);
    const reverseItem = buildRelationEdgeDdbItem(to, relation, 'in', from, edge.metadata);

    await this.dependencies.putEdges([forwardItem, reverseItem]);
  }

  /**
   * Remove an edge by key.
   * @param key Edge key to remove.
   * @returns Promise resolved once removed.
   */
  async removeEdge(key: EdgeKey): Promise<void> {
    const { from, to, relation } = key;
    const forwardKey = buildRelationEdgeDdbKey(from, relation, 'out', to);
    const reverseKey = buildRelationEdgeDdbKey(to, relation, 'in', from);

    await this.dependencies.deleteEdges([forwardKey, reverseKey]);
  }

  /**
   * Query outgoing edges for an entity and relation.
   * @param fromId Source entity id.
   * @param relation Relation name.
   * @param options Optional paging options.
   * @returns Page of outgoing edges.
   */
  async getOutgoing(
    fromId: string,
    relation: string,
    options: RelationalQueryOptions = {},
  ): Promise<EdgePage<TMetadata>> {
    const cursorState = decodeRelationalCursor(options.cursor);
    const exclusiveStartKey = decodeRelationEdgesToken(cursorState?.continuationToken);
    const edgeKey = encodeRelationEdgePartitionKey(fromId, relation, 'out');
    const result = await this.dependencies.queryEdges({
      edgeKey,
      limit: options.limit,
      exclusiveStartKey,
    });

    const edges = result.items.map((item) => ({
      key: { from: fromId, to: item.otherId, relation },
      metadata: item.metadata,
    }));

    return {
      edges,
      nextCursor: encodeRelationalCursor({
        continuationToken: encodeRelationEdgesToken(result.lastEvaluatedKey),
      }),
    };
  }

  /**
   * Query incoming edges for an entity and relation.
   * @param toId Target entity id.
   * @param relation Relation name.
   * @param options Optional paging options.
   * @returns Page of incoming edges.
   */
  async getIncoming(
    toId: string,
    relation: string,
    options: RelationalQueryOptions = {},
  ): Promise<EdgePage<TMetadata>> {
    const cursorState = decodeRelationalCursor(options.cursor);
    const exclusiveStartKey = decodeRelationEdgesToken(cursorState?.continuationToken);
    const edgeKey = encodeRelationEdgePartitionKey(toId, relation, 'in');
    const result = await this.dependencies.queryEdges({
      edgeKey,
      limit: options.limit,
      exclusiveStartKey,
    });

    const edges = result.items.map((item) => ({
      key: { from: item.otherId, to: toId, relation },
      metadata: item.metadata,
    }));

    return {
      edges,
      nextCursor: encodeRelationalCursor({
        continuationToken: encodeRelationEdgesToken(result.lastEvaluatedKey),
      }),
    };
  }
}
