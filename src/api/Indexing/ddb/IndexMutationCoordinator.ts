import { AsyncLocalStorage } from "node:async_hooks";
import { batchWriteWithRetry } from "./AwsSdkV3Adapter";
import type { DynamoBatchWriter, WriteRequest } from "./Types";

/** One derived write targeting a physical DynamoDB table. */
export type IndexMutationWrite = {
  tableName: string;
  request: WriteRequest;
};

const requestKey = ({ tableName, request }: IndexMutationWrite): string => {
  const value = request.PutRequest?.Item ?? request.DeleteRequest?.Key;
  if (typeof value?.pk !== "string" || typeof value?.sk !== "string") {
    throw new Error("Index mutations require exact string pk/sk keys.");
  }
  return JSON.stringify([tableName, value?.pk, value?.sk]);
};

const coalesceWrites = (writes: IndexMutationWrite[]): IndexMutationWrite[] => {
  const byKey = new Map<string, IndexMutationWrite>();
  for (const write of writes) {
    const key = requestKey(write);
    if (byKey.has(key)) {
      byKey.delete(key);
    }
    byKey.set(key, write);
  }
  return Array.from(byKey.values());
};

/**
 * Shared forward-only coordinator for compatible derived index writes.
 *
 * A scope collects writes from every backend using this instance, coalesces
 * repeated physical keys to their final mutation, then flushes requests in
 * DynamoDB batches of at most 25. It does not add transactions or rollback.
 */
export class IndexMutationCoordinator {
  private readonly scopes = new AsyncLocalStorage<{
    writes: IndexMutationWrite[];
  }>();

  constructor(private readonly client: DynamoBatchWriter) {}

  /** Queue inside an active scope, or flush immediately outside one. */
  async write(writes: IndexMutationWrite[]): Promise<void> {
    if (writes.length === 0) {
      return;
    }
    const scope = this.scopes.getStore();
    if (scope) {
      scope.writes.push(...writes);
      return;
    }
    await this.flush(writes);
  }

  /** Collect all compatible writes produced by one higher-level operation. */
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.scopes.getStore()) {
      return operation();
    }
    const scope = { writes: [] as IndexMutationWrite[] };
    let result: T;
    let operationError: unknown;
    try {
      result = await this.scopes.run(scope, operation);
    } catch (error) {
      operationError = error;
    }

    try {
      await this.flush(scope.writes);
    } catch (flushError) {
      if (operationError !== undefined) {
        throw new AggregateError(
          [operationError, flushError],
          "Index operation and derived-write flush both failed.",
        );
      }
      throw flushError;
    }
    if (operationError !== undefined) {
      throw operationError;
    }
    return result!;
  }

  private async flush(writes: IndexMutationWrite[]): Promise<void> {
    const coalesced = coalesceWrites(writes);
    for (let index = 0; index < coalesced.length; index += 25) {
      const batch = coalesced.slice(index, index + 25);
      const requestItems = batch.reduce<Record<string, WriteRequest[]>>(
        (result, { tableName, request }) => {
          result[tableName] = result[tableName] ?? [];
          result[tableName].push(request);
          return result;
        },
        {},
      );
      await batchWriteWithRetry(this.client, requestItems);
    }
  }
}
