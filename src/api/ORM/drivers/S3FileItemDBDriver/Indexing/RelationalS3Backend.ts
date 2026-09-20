/**
 * S3 IO for Voltra's generic relational indexing strategy.
 */
import {
  INDEX_ITEM_KINDS,
  buildIndexDocumentSortKey,
  buildIndexScalarKey,
  type IndexTableKey,
} from "../../../../Indexing/IndexTable";
import {
  RelationalIndexBackend,
  type RelationalIndexStorage,
  type RelationalStorageKey,
  type RelationalStorageRecord,
} from "../../../../Indexing/rel/RelationalIndexBackend";
import type { S3IndexObjectStore } from "./S3IndexObjectStore";
import { S3IndexRecordStore } from "./S3IndexRecordStore";

type EdgeMetadata = Record<string, unknown>;

type RelationalS3Record<
  TMetadata extends EdgeMetadata = EdgeMetadata,
> = IndexTableKey & RelationalStorageRecord<TMetadata> & {
  kind: typeof INDEX_ITEM_KINDS.relationshipEdge;
};

const COLLECTION_RELATION = "relational-edge";

const partitionKey = (
  entityId: string,
  relation: string,
  direction: "out" | "in",
): string =>
  buildIndexScalarKey(
    INDEX_ITEM_KINDS.relationshipEdge,
    "entity",
    entityId,
    relation,
    direction,
  );

const toRecord = <TMetadata extends EdgeMetadata>(
  record: RelationalStorageRecord<TMetadata>,
): RelationalS3Record<TMetadata> => ({
  pk: partitionKey(record.entityId, record.relation, record.direction),
  sk: buildIndexDocumentSortKey(record.otherId),
  kind: INDEX_ITEM_KINDS.relationshipEdge,
  ...record,
});

const toKey = (key: RelationalStorageKey): IndexTableKey => ({
  pk: partitionKey(key.entityId, key.relation, key.direction),
  sk: buildIndexDocumentSortKey(key.otherId),
});

class S3RelationalIndexStorage<
  TMetadata extends EdgeMetadata = EdgeMetadata,
> implements RelationalIndexStorage<TMetadata> {
  constructor(private readonly records: S3IndexRecordStore) {}

  async put(records: Array<RelationalStorageRecord<TMetadata>>): Promise<void> {
    await this.records.putMany(
      COLLECTION_RELATION,
      records.map(toRecord),
    );
  }

  async delete(keys: RelationalStorageKey[]): Promise<void> {
    await this.records.deleteMany(
      COLLECTION_RELATION,
      keys.map(toKey),
    );
  }

  async query(query: {
    entityId: string;
    relation: string;
    direction: "out" | "in";
    limit?: number;
    continuationToken?: string;
  }) {
    const page = await this.records.listPartition<
      RelationalS3Record<TMetadata>
    >(
      COLLECTION_RELATION,
      partitionKey(query.entityId, query.relation, query.direction),
      {
        limit: query.limit,
        cursor: query.continuationToken,
      },
    );

    return {
      records: page.items.map((item) => ({
        entityId: item.entityId,
        relation: item.relation,
        direction: item.direction,
        otherId: item.otherId,
        ...(item.metadata !== undefined ? { metadata: item.metadata } : {}),
      })),
      ...(page.cursor ? { continuationToken: page.cursor } : {}),
    };
  }
}

export type RelationalS3BackendConfig = {
  store: S3IndexObjectStore;
};

/**
 * S3 IO wrapper around the generic relational indexing strategy.
 */
export class RelationalS3Backend<
  TMetadata extends EdgeMetadata = EdgeMetadata,
> extends RelationalIndexBackend<TMetadata> {
  constructor(config: RelationalS3BackendConfig) {
    super(
      new S3RelationalIndexStorage<TMetadata>(
        new S3IndexRecordStore(config.store),
      ),
    );
  }
}
