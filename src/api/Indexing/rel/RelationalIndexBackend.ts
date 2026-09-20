/**
 * Storage-neutral relational indexing strategy.
 *
 * Voltra owns directional duplication, edge reconstruction, and public cursor
 * semantics. Storage drivers only persist/query directional edge records.
 */
import {
  decodeRelationalCursor,
  encodeRelationalCursor,
} from "./Cursor";
import type {
  Direction,
  Edge,
  EdgeKey,
  EdgePage,
  RelationalBackend,
  RelationalQueryOptions,
} from "./Types";

export type RelationalStorageKey = {
  entityId: string;
  relation: string;
  direction: Direction;
  otherId: string;
};

export type RelationalStorageRecord<
  TMetadata = Record<string, unknown>,
> = RelationalStorageKey & {
  metadata?: TMetadata;
};

export type RelationalStorageQuery = {
  entityId: string;
  relation: string;
  direction: Direction;
  limit?: number;
  continuationToken?: string;
};

export type RelationalStoragePage<
  TMetadata = Record<string, unknown>,
> = {
  records: Array<RelationalStorageRecord<TMetadata>>;
  continuationToken?: string;
};

/** Minimal persistence contract required by generic relational indexing. */
export type RelationalIndexStorage<
  TMetadata = Record<string, unknown>,
> = {
  put(records: Array<RelationalStorageRecord<TMetadata>>): Promise<void> | void;
  delete(keys: RelationalStorageKey[]): Promise<void> | void;
  query(
    query: RelationalStorageQuery,
  ): Promise<RelationalStoragePage<TMetadata>> | RelationalStoragePage<TMetadata>;
};

const buildStorageRecords = <TMetadata>(
  edge: Edge<TMetadata>,
): Array<RelationalStorageRecord<TMetadata>> => {
  const { from, to, relation } = edge.key;
  return [
    {
      entityId: from,
      relation,
      direction: "out",
      otherId: to,
      ...(edge.metadata !== undefined ? { metadata: edge.metadata } : {}),
    },
    {
      entityId: to,
      relation,
      direction: "in",
      otherId: from,
      ...(edge.metadata !== undefined ? { metadata: edge.metadata } : {}),
    },
  ];
};

const buildStorageKeys = (key: EdgeKey): RelationalStorageKey[] => {
  const { from, to, relation } = key;
  return [
    { entityId: from, relation, direction: "out", otherId: to },
    { entityId: to, relation, direction: "in", otherId: from },
  ];
};

/**
 * Generic relational backend shared by every storage driver.
 */
export class RelationalIndexBackend<
  TMetadata = Record<string, unknown>,
> implements RelationalBackend<TMetadata> {
  constructor(
    private readonly storage: RelationalIndexStorage<TMetadata>,
  ) {}

  async putEdge(edge: Edge<TMetadata>): Promise<void> {
    await this.storage.put(buildStorageRecords(edge));
  }

  async removeEdge(key: EdgeKey): Promise<void> {
    await this.storage.delete(buildStorageKeys(key));
  }

  private async getDirectional(
    entityId: string,
    relation: string,
    direction: Direction,
    options: RelationalQueryOptions = {},
  ): Promise<EdgePage<TMetadata>> {
    const cursor = decodeRelationalCursor(options.cursor);
    const page = await this.storage.query({
      entityId,
      relation,
      direction,
      limit: options.limit,
      continuationToken: cursor?.continuationToken ?? cursor?.lastId,
    });

    const edges = page.records.map((record) => ({
      key:
        direction === "out"
          ? { from: entityId, to: record.otherId, relation }
          : { from: record.otherId, to: entityId, relation },
      ...(record.metadata !== undefined
        ? { metadata: record.metadata }
        : {}),
    }));

    return {
      edges,
      nextCursor: page.continuationToken
        ? encodeRelationalCursor({
            continuationToken: page.continuationToken,
          })
        : undefined,
    };
  }

  getOutgoing(
    fromId: string,
    relation: string,
    options: RelationalQueryOptions = {},
  ): Promise<EdgePage<TMetadata>> {
    return this.getDirectional(fromId, relation, "out", options);
  }

  getIncoming(
    toId: string,
    relation: string,
    options: RelationalQueryOptions = {},
  ): Promise<EdgePage<TMetadata>> {
    return this.getDirectional(toId, relation, "in", options);
  }
}
