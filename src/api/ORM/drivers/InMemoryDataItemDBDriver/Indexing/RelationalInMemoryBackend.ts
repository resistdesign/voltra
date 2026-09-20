/**
 * In-memory IO for Voltra's generic relational indexing strategy.
 */
import { buildIndexDocumentSortKey } from "../../../../Indexing/IndexTable";
import {
  RelationalIndexBackend,
  type RelationalIndexStorage,
  type RelationalStorageKey,
  type RelationalStorageRecord,
} from "../../../../Indexing/rel/RelationalIndexBackend";

type EdgeMetadata = Record<string, unknown>;

const partitionKey = (key: Omit<RelationalStorageKey, "otherId">): string =>
  JSON.stringify([key.entityId, key.relation, key.direction]);

class InMemoryRelationalIndexStorage<
  TMetadata extends EdgeMetadata = EdgeMetadata,
> implements RelationalIndexStorage<TMetadata> {
  private readonly partitions = new Map<
    string,
    Map<string, TMetadata | undefined>
  >();

  put(records: Array<RelationalStorageRecord<TMetadata>>): void {
    for (const record of records) {
      const key = partitionKey(record);
      const partition = this.partitions.get(key) ?? new Map();
      partition.set(record.otherId, record.metadata);
      this.partitions.set(key, partition);
    }
  }

  delete(keys: RelationalStorageKey[]): void {
    for (const key of keys) {
      const partitionId = partitionKey(key);
      const partition = this.partitions.get(partitionId);
      partition?.delete(key.otherId);
      if (partition?.size === 0) {
        this.partitions.delete(partitionId);
      }
    }
  }

  query(query: {
    entityId: string;
    relation: string;
    direction: "out" | "in";
    limit?: number;
    continuationToken?: string;
  }) {
    const partition = this.partitions.get(partitionKey(query));
    const ids = partition
      ? Array.from(partition.keys()).sort((left, right) => {
          const leftKey = buildIndexDocumentSortKey(left);
          const rightKey = buildIndexDocumentSortKey(right);
          return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
        })
      : [];

    const start = query.continuationToken
      ? ids.findIndex((id) => id === query.continuationToken) + 1
      : 0;
    const safeStart = Math.max(0, start);
    const limit = Math.max(1, query.limit ?? (ids.length || 1));
    const pageIds = ids.slice(safeStart, safeStart + limit);
    const last = pageIds[pageIds.length - 1];

    return {
      records: pageIds.map((otherId) => ({
        entityId: query.entityId,
        relation: query.relation,
        direction: query.direction,
        otherId,
        ...(partition?.get(otherId) !== undefined
          ? { metadata: partition?.get(otherId) }
          : {}),
      })),
      ...(last && safeStart + pageIds.length < ids.length
        ? { continuationToken: last }
        : {}),
    };
  }
}

/**
 * In-memory IO wrapper around the generic relational indexing strategy.
 */
export class RelationalInMemoryBackend<
  TMetadata extends EdgeMetadata = EdgeMetadata,
> extends RelationalIndexBackend<TMetadata> {
  constructor() {
    super(new InMemoryRelationalIndexStorage<TMetadata>());
  }
}
