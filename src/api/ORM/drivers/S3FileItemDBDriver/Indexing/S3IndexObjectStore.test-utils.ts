import type {
  S3IndexConditionalPutOptions,
  S3IndexConditionalPutResult,
  S3IndexObjectListOptions,
  S3IndexObjectListPage,
  S3IndexObjectStore,
  S3IndexStoredObject,
} from "./S3IndexObjectStore";

type Entry = {
  value: unknown;
  version: number;
};

const clone = <T>(value: T): T => structuredClone(value);

/** Deterministic in-memory implementation of the S3 indexing object contract. */
export class InMemoryS3IndexObjectStore implements S3IndexObjectStore {
  private readonly entries = new Map<string, Entry>();

  async get<T = unknown>(
    key: string,
  ): Promise<S3IndexStoredObject<T> | undefined> {
    const entry = this.entries.get(key);
    return entry
      ? {
          value: clone(entry.value) as T,
          etag: String(entry.version),
        }
      : undefined;
  }

  async put<T = unknown>(
    key: string,
    value: T,
    options: S3IndexConditionalPutOptions = {},
  ): Promise<S3IndexConditionalPutResult> {
    const existing = this.entries.get(key);
    if (options.ifNoneMatch && existing) {
      return { conditionFailed: true };
    }
    if (
      options.ifMatch &&
      (!existing || String(existing.version) !== options.ifMatch)
    ) {
      return { conditionFailed: true };
    }
    const version = (existing?.version ?? 0) + 1;
    this.entries.set(key, { value: clone(value), version });
    return { etag: String(version) };
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async list(
    prefix: string,
    options: S3IndexObjectListOptions = {},
  ): Promise<S3IndexObjectListPage> {
    const ordered = Array.from(this.entries.keys())
      .filter((key) => key.startsWith(prefix))
      .sort();
    const resumeKey = options.cursor ?? options.afterKey;
    const start = resumeKey
      ? Math.max(0, ordered.findIndex((key) => key === resumeKey) + 1)
      : 0;
    const limit = Math.max(1, options.limit ?? 100);
    const keys = ordered.slice(start, start + limit);
    const last = keys[keys.length - 1];
    return {
      keys,
      ...(last && start + keys.length < ordered.length
        ? { cursor: last }
        : {}),
    };
  }
}
