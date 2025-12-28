import { decodeRelationalCursor, encodeRelationalCursor } from './cursor.js';
import type { Direction, Edge, EdgeKey, EdgePage, RelationalQueryOptions } from './types.js';

type EdgeMetadata = Record<string, unknown>;

export type RelationEdgesDdbKey = {
  edgeKey: string;
  otherId: string;
};

export type RelationEdgesDdbItem<TMetadata extends EdgeMetadata = EdgeMetadata> = RelationEdgesDdbKey & {
  metadata?: TMetadata;
};

export const relationEdgesSchema = {
  tableName: 'RelationEdges',
  partitionKey: 'edgeKey',
  sortKey: 'otherId',
  metadataAttribute: 'metadata',
} as const;

export function encodeRelationEdgePartitionKey(
  entityId: string,
  relation: string,
  direction: Direction,
): string {
  return `${entityId}\u0000${relation}\u0000${direction}`;
}

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

export type RelationEdgesQueryRequest = {
  edgeKey: string;
  limit?: number;
  exclusiveStartKey?: RelationEdgesDdbKey;
};

export type RelationEdgesQueryResult<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  items: RelationEdgesDdbItem<TMetadata>[];
  lastEvaluatedKey?: RelationEdgesDdbKey;
};

export type RelationEdgesDdbDependencies<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  putEdges(items: RelationEdgesDdbItem<TMetadata>[]): Promise<void>;
  deleteEdges(keys: RelationEdgesDdbKey[]): Promise<void>;
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

export class RelationalDdbBackend<TMetadata extends EdgeMetadata = EdgeMetadata> {
  constructor(private readonly dependencies: RelationEdgesDdbDependencies<TMetadata>) {}

  async putEdge(edge: Edge<TMetadata>): Promise<void> {
    const { from, to, relation } = edge.key;
    const forwardItem = buildRelationEdgeDdbItem(from, relation, 'out', to, edge.metadata);
    const reverseItem = buildRelationEdgeDdbItem(to, relation, 'in', from, edge.metadata);

    await this.dependencies.putEdges([forwardItem, reverseItem]);
  }

  async removeEdge(key: EdgeKey): Promise<void> {
    const { from, to, relation } = key;
    const forwardKey = buildRelationEdgeDdbKey(from, relation, 'out', to);
    const reverseKey = buildRelationEdgeDdbKey(to, relation, 'in', from);

    await this.dependencies.deleteEdges([forwardKey, reverseKey]);
  }

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
