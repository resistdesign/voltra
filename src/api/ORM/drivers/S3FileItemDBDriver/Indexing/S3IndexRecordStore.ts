import type { IndexTableKey } from "../../../../Indexing/IndexTable";
import type {
  S3IndexObjectListOptions,
  S3IndexObjectStore,
} from "./S3IndexObjectStore";

export type S3IndexRecord = IndexTableKey & Record<string, unknown>;

export type S3IndexRecordPage<T extends S3IndexRecord = S3IndexRecord> = {
  items: T[];
  cursor?: string;
};

export type S3IndexRecordQueryOptions = S3IndexObjectListOptions & {
  reverse?: boolean;
};

const segment = (value: string): string => encodeURIComponent(value);

const encodeAscendingOrder = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  return (
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") +
    "00"
  );
};

const encodeDescendingOrder = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  return (
    Array.from(bytes, (byte) => (255 - byte).toString(16).padStart(2, "0")).join(
      "",
    ) + "ff"
  );
};

const collectionPrefix = (
  collection: string,
  reverse = false,
): string => `${segment(collection)}/${reverse ? "desc" : "asc"}/`;

const partitionPrefix = (
  collection: string,
  pk: string,
  reverse = false,
): string => `${collectionPrefix(collection, reverse)}${segment(pk)}/`;

const recordKey = (
  collection: string,
  key: IndexTableKey,
  reverse = false,
): string =>
  `${partitionPrefix(collection, key.pk, reverse)}${
    reverse
      ? encodeDescendingOrder(key.sk)
      : encodeAscendingOrder(key.sk)
  }.json`;

/**
 * Driver-local mapping from Voltra logical index records to ordered S3 objects.
 *
 * Every logical record is mirrored under ascending and descending physical
 * keys so bounded reverse traversal does not require an unbounded S3 scan.
 */
export class S3IndexRecordStore {
  constructor(private readonly store: S3IndexObjectStore) {}

  async get<T extends S3IndexRecord>(
    collection: string,
    key: IndexTableKey,
  ): Promise<{ item: T; etag?: string } | undefined> {
    const record = await this.store.get<T>(recordKey(collection, key));
    return record
      ? {
          item: record.value,
          ...(record.etag ? { etag: record.etag } : {}),
        }
      : undefined;
  }

  async put<T extends S3IndexRecord>(
    collection: string,
    item: T,
  ): Promise<void> {
    await this.store.put(recordKey(collection, item), item);
    await this.store.put(recordKey(collection, item, true), item);
  }

  async putIfVersion<T extends S3IndexRecord & { version: number }>(
    collection: string,
    item: T,
    expectedVersion: number | undefined,
  ): Promise<boolean> {
    const current = await this.get<T>(collection, item);

    if (expectedVersion === undefined) {
      if (current) {
        return false;
      }
      const result = await this.store.put(
        recordKey(collection, item),
        item,
        { ifNoneMatch: true },
      );
      if (result.conditionFailed) {
        return false;
      }
      await this.store.put(recordKey(collection, item, true), item);
      return true;
    }

    if (!current || current.item.version !== expectedVersion || !current.etag) {
      return false;
    }

    const result = await this.store.put(
      recordKey(collection, item),
      item,
      { ifMatch: current.etag },
    );
    if (result.conditionFailed) {
      return false;
    }
    await this.store.put(recordKey(collection, item, true), item);
    return true;
  }

  async delete(collection: string, key: IndexTableKey): Promise<void> {
    await this.store.delete(recordKey(collection, key));
    await this.store.delete(recordKey(collection, key, true));
  }

  async putMany<T extends S3IndexRecord>(
    collection: string,
    items: T[],
  ): Promise<void> {
    for (const item of items) {
      await this.put(collection, item);
    }
  }

  async deleteMany(
    collection: string,
    keys: IndexTableKey[],
  ): Promise<void> {
    for (const key of keys) {
      await this.delete(collection, key);
    }
  }

  async listPartition<T extends S3IndexRecord>(
    collection: string,
    pk: string,
    options: S3IndexRecordQueryOptions = {},
  ): Promise<S3IndexRecordPage<T>> {
    const reverse = !!options.reverse;
    const prefix = partitionPrefix(collection, pk, reverse);
    const page = await this.store.list(prefix, {
      limit: options.limit,
      cursor: options.cursor,
    });
    const values = await Promise.all(
      page.keys.map((key) => this.store.get<T>(key)),
    );
    return {
      items: values.flatMap((entry) => (entry ? [entry.value] : [])),
      ...(page.cursor ? { cursor: page.cursor } : {}),
    };
  }

  async listCollection<T extends S3IndexRecord>(
    collection: string,
    options: S3IndexObjectListOptions = {},
  ): Promise<S3IndexRecordPage<T>> {
    const page = await this.store.list(collectionPrefix(collection), options);
    const values = await Promise.all(
      page.keys.map((key) => this.store.get<T>(key)),
    );
    return {
      items: values.flatMap((entry) => (entry ? [entry.value] : [])),
      ...(page.cursor ? { cursor: page.cursor } : {}),
    };
  }
}
