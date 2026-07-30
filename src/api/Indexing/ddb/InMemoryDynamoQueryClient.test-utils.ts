import { INDEX_TABLE_KIND_ATTRIBUTE } from "../IndexTable";
import type {
  AttributeMap,
  BatchGetItemInput,
  BatchWriteItemInput,
  DynamoQueryClient,
  GetItemInput,
  PutItemInput,
  QueryInput,
} from "./Types";

const clone = <T>(value: T): T => structuredClone(value);

const keyOf = (item: AttributeMap): string =>
  JSON.stringify([item.pk, item.sk]);

type EventualSnapshot = {
  item?: AttributeMap;
  remainingReads: number;
};

export type InMemoryDynamoQueryClientOptions = {
  /**
   * Number of eventually consistent get reads that continue to expose the
   * pre-write value after each mutation.
   */
  eventuallyConsistentGetLag?: number;
  /**
   * Reverse object property insertion order in returned records.
   */
  reverseReadPropertyOrder?: boolean;
};

const reversePropertyOrder = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(reversePropertyOrder);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, entry]) => [key, reversePropertyOrder(entry)]),
  );
};

/**
 * Test-only map implementation of the DynamoDB operations used by the unified
 * index backends.
 *
 * It exists only to exercise the real DynamoDB drivers without contacting AWS;
 * no production in-memory driver depends on it.
 */
export class InMemoryDynamoQueryClient implements DynamoQueryClient {
  private readonly tables = new Map<string, Map<string, AttributeMap>>();
  private readonly eventualSnapshots = new Map<string, EventualSnapshot>();

  constructor(
    private readonly options: InMemoryDynamoQueryClientOptions = {},
  ) {}

  /** Table names touched by the exercised backends. */
  readonly touchedTables = new Set<string>();

  /** Logical record kinds submitted in each physical batch. */
  readonly batchKinds: string[][] = [];

  /** Number of strongly consistent get reads requested by tested drivers. */
  consistentGetCount = 0;

  /** Number of deliberately stale get reads served by this test client. */
  staleGetCount = 0;

  /** Number of batch-get calls issued by tested drivers. */
  batchGetCount = 0;

  /** Number of keys requested through batch-get calls. */
  batchGetKeyCount = 0;

  private visibilityKey(tableName: string, key: AttributeMap): string {
    return `${tableName}\u0000${keyOf(key)}`;
  }

  private recordMutation(
    tableName: string,
    key: AttributeMap,
    previous?: AttributeMap,
  ): void {
    const remainingReads = this.options.eventuallyConsistentGetLag ?? 0;
    if (remainingReads <= 0) {
      return;
    }
    this.eventualSnapshots.set(this.visibilityKey(tableName, key), {
      item: previous ? clone(previous) : undefined,
      remainingReads,
    });
  }

  private returnedItem(item?: AttributeMap): AttributeMap | undefined {
    if (!item) {
      return undefined;
    }
    const copied = clone(item);
    return this.options.reverseReadPropertyOrder
      ? (reversePropertyOrder(copied) as AttributeMap)
      : copied;
  }

  private readItem(
    tableName: string,
    key: AttributeMap,
    consistentRead = false,
  ): AttributeMap | undefined {
    if (consistentRead) {
      this.consistentGetCount += 1;
    } else {
      const visibilityKey = this.visibilityKey(tableName, key);
      const snapshot = this.eventualSnapshots.get(visibilityKey);
      if (snapshot && snapshot.remainingReads > 0) {
        snapshot.remainingReads -= 1;
        this.staleGetCount += 1;
        if (snapshot.remainingReads === 0) {
          this.eventualSnapshots.delete(visibilityKey);
        }
        return this.returnedItem(snapshot.item);
      }
    }
    return this.returnedItem(this.table(tableName).get(keyOf(key)));
  }

  private table(name: string): Map<string, AttributeMap> {
    this.touchedTables.add(name);
    const table = this.tables.get(name) ?? new Map<string, AttributeMap>();
    this.tables.set(name, table);
    return table;
  }

  async batchWriteItem(input: BatchWriteItemInput) {
    this.batchKinds.push(
      Object.values(input.RequestItems)
        .flat()
        .map((request) =>
          String(
            request.PutRequest?.Item[INDEX_TABLE_KIND_ATTRIBUTE] ?? "delete",
          ),
        ),
    );
    for (const [tableName, requests] of Object.entries(input.RequestItems)) {
      const table = this.table(tableName);
      for (const request of requests) {
        if (request.PutRequest) {
          const item = clone(request.PutRequest.Item);
          this.recordMutation(tableName, item, table.get(keyOf(item)));
          table.set(keyOf(item), item);
        }
        if (request.DeleteRequest) {
          const keyAttributes = Object.keys(request.DeleteRequest.Key).sort();
          if (
            keyAttributes.length !== 2 ||
            keyAttributes[0] !== "pk" ||
            keyAttributes[1] !== "sk"
          ) {
            throw new Error(
              "Unified index deletes must contain exactly the pk/sk key.",
            );
          }
          this.recordMutation(
            tableName,
            request.DeleteRequest.Key,
            table.get(keyOf(request.DeleteRequest.Key)),
          );
          table.delete(keyOf(request.DeleteRequest.Key));
        }
      }
    }
    return {};
  }

  async batchGetItem(input: BatchGetItemInput) {
    this.batchGetCount += 1;
    this.batchGetKeyCount += Object.values(input.RequestItems).reduce(
      (count, request) => count + request.Keys.length,
      0,
    );
    const responses: Record<string, AttributeMap[]> = {};
    for (const [tableName, request] of Object.entries(input.RequestItems)) {
      responses[tableName] = request.Keys.flatMap((key) => {
        const item = this.readItem(tableName, key, request.ConsistentRead);
        return item ? [item] : [];
      });
    }
    return { Responses: responses };
  }

  async getItem(input: GetItemInput) {
    const item = this.readItem(
      input.TableName,
      input.Key,
      input.ConsistentRead,
    );
    return item ? { Item: item } : {};
  }

  async putItem(input: PutItemInput) {
    const table = this.table(input.TableName);
    const current = table.get(keyOf(input.Item));
    if (
      input.ConditionExpression?.includes("attribute_not_exists(#pk)") &&
      current
    ) {
      return { conditionFailed: true };
    }
    const expected = input.ExpressionAttributeValues?.[":expectedVersion"];
    if (expected !== undefined && (current?.version ?? 0) !== expected) {
      return { conditionFailed: true };
    }
    this.recordMutation(input.TableName, input.Item, current);
    table.set(keyOf(input.Item), clone(input.Item));
    return {};
  }

  async query(input: QueryInput) {
    const pkName =
      input.ExpressionAttributeNames?.["#pk"] ??
      input.ExpressionAttributeNames?.["#termKey"] ??
      input.ExpressionAttributeNames?.["#field"] ??
      input.ExpressionAttributeNames?.["#edgeKey"] ??
      "pk";
    const pkValue =
      input.ExpressionAttributeValues[":pk"] ??
      input.ExpressionAttributeValues[":termKey"] ??
      input.ExpressionAttributeValues[":field"] ??
      input.ExpressionAttributeValues[":edgeKey"];
    const skName = input.ExpressionAttributeNames?.["#rangeKey"] ?? "sk";
    let items = Array.from(this.table(input.TableName).values())
      .filter((item) => item[pkName] === pkValue)
      .sort((left, right) =>
        String(left[skName]) < String(right[skName]) ? -1 : 1,
      );

    if (input.KeyConditionExpression.includes("BETWEEN")) {
      const lower = String(input.ExpressionAttributeValues[":lower"]);
      const upper = String(input.ExpressionAttributeValues[":upper"]);
      items = items.filter((item) => {
        const key = String(item[skName]);
        return key >= lower && key <= upper;
      });
    } else if (input.KeyConditionExpression.includes(">=")) {
      const lower = String(input.ExpressionAttributeValues[":lower"]);
      items = items.filter((item) => String(item[skName]) >= lower);
    } else if (input.KeyConditionExpression.includes("<=")) {
      const upper = String(input.ExpressionAttributeValues[":upper"]);
      items = items.filter((item) => String(item[skName]) <= upper);
    }

    if (input.ScanIndexForward === false) {
      items.reverse();
    }
    if (input.ExclusiveStartKey) {
      const cursorSortKey = String(
        input.ExclusiveStartKey[skName] ?? input.ExclusiveStartKey.sk,
      );
      items = items.filter((item) =>
        input.ScanIndexForward === false
          ? String(item[skName]) < cursorSortKey
          : String(item[skName]) > cursorSortKey,
      );
    }
    const limit = input.Limit ?? items.length;
    const page = items.slice(0, limit);
    const last = page[page.length - 1];
    return {
      Items: page.map(clone),
      LastEvaluatedKey:
        page.length < items.length && last
          ? { pk: last.pk, sk: last.sk }
          : undefined,
    };
  }

  /** Deep-cloned raw records stored in one Dynamo-shaped table. */
  snapshot(tableName: string): AttributeMap[] {
    return Array.from(this.table(tableName).values(), clone);
  }

  /** Deep-cloned keyed view of one Dynamo-shaped table. */
  snapshotMap(tableName: string): ReadonlyMap<string, AttributeMap> {
    return new Map(
      Array.from(this.table(tableName), ([key, value]) => [key, clone(value)]),
    );
  }
}
