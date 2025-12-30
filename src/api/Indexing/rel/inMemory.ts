/**
 * @packageDocumentation
 *
 * In-memory relational edge store with directional queries and cursor paging.
 */
import { decodeRelationalCursor, encodeRelationalCursor } from "./cursor";
import type { Edge, EdgeKey, EdgePage, RelationalQueryOptions } from "./types";

type EdgeMetadata = Record<string, unknown>;

type EdgeEntry<TMetadata extends EdgeMetadata> = {
  otherId: string;
  metadata?: TMetadata;
};

type EdgeLookup<TMetadata extends EdgeMetadata> = Map<string, Map<string, EdgeEntry<TMetadata>>>;

function edgeKey(entityId: string, relation: string): string {
  return `${entityId}\u0000${relation}`;
}

function findStartIndex(ids: string[], lastId?: string): number {
  if (!lastId) {
    return 0;
  }

  let low = 0;
  let high = ids.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (ids[mid].localeCompare(lastId) <= 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

function paginateIds<TMetadata extends EdgeMetadata>(
  ids: string[],
  options: RelationalQueryOptions,
  buildEdge: (otherId: string) => Edge<TMetadata>,
): EdgePage<TMetadata> {
  const cursorState = decodeRelationalCursor(options.cursor);
  const startIndex = findStartIndex(ids, cursorState?.lastId);
  const limit = options.limit ?? ids.length;
  const slice = ids.slice(startIndex, startIndex + limit);
  const edges = slice.map((id) => buildEdge(id));

  if (startIndex + limit < ids.length && slice.length > 0) {
    return {
      edges,
      nextCursor: encodeRelationalCursor({ lastId: slice[slice.length - 1] }),
    };
  }

  return { edges };
}

/**
 * In-memory relational backend for tests and local runs.
 */
export class RelationalInMemoryBackend<TMetadata extends EdgeMetadata = EdgeMetadata> {
  private forward: EdgeLookup<TMetadata> = new Map();
  private reverse: EdgeLookup<TMetadata> = new Map();

  putEdge(edge: Edge<TMetadata>): void {
    const { from, to, relation } = edge.key;
    const forwardKey = edgeKey(from, relation);
    const reverseKey = edgeKey(to, relation);

    const forwardMap = this.forward.get(forwardKey) ?? new Map();
    forwardMap.set(to, { otherId: to, metadata: edge.metadata });
    this.forward.set(forwardKey, forwardMap);

    const reverseMap = this.reverse.get(reverseKey) ?? new Map();
    reverseMap.set(from, { otherId: from, metadata: edge.metadata });
    this.reverse.set(reverseKey, reverseMap);
  }

  removeEdge(key: EdgeKey): void {
    const { from, to, relation } = key;
    const forwardKey = edgeKey(from, relation);
    const reverseKey = edgeKey(to, relation);

    const forwardMap = this.forward.get(forwardKey);
    forwardMap?.delete(to);
    if (forwardMap && forwardMap.size === 0) {
      this.forward.delete(forwardKey);
    }

    const reverseMap = this.reverse.get(reverseKey);
    reverseMap?.delete(from);
    if (reverseMap && reverseMap.size === 0) {
      this.reverse.delete(reverseKey);
    }
  }

  getOutgoing(
    fromId: string,
    relation: string,
    options: RelationalQueryOptions = {},
  ): EdgePage<TMetadata> {
    const forwardKey = edgeKey(fromId, relation);
    const map = this.forward.get(forwardKey);
    const ids = map ? Array.from(map.keys()).sort((a, b) => a.localeCompare(b)) : [];

    return paginateIds(ids, options, (otherId) => ({
      key: { from: fromId, to: otherId, relation },
      metadata: map?.get(otherId)?.metadata,
    }));
  }

  getIncoming(
    toId: string,
    relation: string,
    options: RelationalQueryOptions = {},
  ): EdgePage<TMetadata> {
    const reverseKey = edgeKey(toId, relation);
    const map = this.reverse.get(reverseKey);
    const ids = map ? Array.from(map.keys()).sort((a, b) => a.localeCompare(b)) : [];

    return paginateIds(ids, options, (otherId) => ({
      key: { from: otherId, to: toId, relation },
      metadata: map?.get(otherId)?.metadata,
    }));
  }
}
