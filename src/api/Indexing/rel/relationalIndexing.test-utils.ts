import { RelationalInMemoryBackend } from "./inMemory";
import { decodeRelationalCursor, encodeRelationalCursor } from "./cursor";
import {
  RelationalDdbBackend,
  buildRelationEdgeDdbItem,
  buildRelationEdgeDdbKey,
  encodeRelationEdgePartitionKey,
  relationEdgesSchema,
} from "./relationalDdb";
import type {
  Edge,
  EdgePage,
  RelationalQueryOptions,
} from "./types";
import {
  handler as relationalHandler,
  setRelationalHandlerDependencies,
} from "./handlers";

type RelationEdgeStoreItem<TMetadata extends Record<string, unknown> = Record<string, unknown>> = {
  edgeKey: string;
  otherId: string;
  metadata?: TMetadata;
};

const buildCursorKey = (request: {
  edgeKey: string;
  exclusiveStartKey?: { edgeKey: string; otherId: string };
  limit?: number;
}) =>
  request.exclusiveStartKey
    ? `${request.edgeKey}|${request.exclusiveStartKey.otherId}|${request.limit ?? ""}`
    : `${request.edgeKey}|${request.limit ?? ""}`;

export const runRelationalIndexingScenario = async () => {
  const inMemory = new RelationalInMemoryBackend<{ weight: number }>();
  inMemory.putEdge({ key: { from: "a", to: "b", relation: "owns" }, metadata: { weight: 1 } });
  inMemory.putEdge({ key: { from: "a", to: "c", relation: "owns" }, metadata: { weight: 2 } });

  const outgoingPage1 = inMemory.getOutgoing("a", "owns", { limit: 1 });
  const outgoingPage2 = inMemory.getOutgoing("a", "owns", {
    limit: 1,
    cursor: outgoingPage1.nextCursor,
  });
  const incomingPage = inMemory.getIncoming("b", "owns");

  const relationalCursor = encodeRelationalCursor({
    lastId: "b",
    continuationToken: "token-1",
  });
  const relationalCursorDecoded = decodeRelationalCursor(relationalCursor);

  const store = new Map<string, RelationEdgeStoreItem<{ weight: number }>[]>(); 
  const ddbBackend = new RelationalDdbBackend<{ weight: number }>({
    putEdges: async (items) => {
      for (const item of items) {
        const list = store.get(item.edgeKey) ?? [];
        const filtered = list.filter((entry) => entry.otherId !== item.otherId);
        filtered.push(item);
        filtered.sort((a, b) => a.otherId.localeCompare(b.otherId));
        store.set(item.edgeKey, filtered);
      }
    },
    deleteEdges: async (keys) => {
      for (const key of keys) {
        const list = store.get(key.edgeKey) ?? [];
        const filtered = list.filter((entry) => entry.otherId !== key.otherId);
        if (filtered.length === 0) {
          store.delete(key.edgeKey);
        } else {
          store.set(key.edgeKey, filtered);
        }
      }
    },
    queryEdges: async (request) => {
      const list = store.get(request.edgeKey) ?? [];
      const startIndex = request.exclusiveStartKey
        ? list.findIndex((entry) => entry.otherId === request.exclusiveStartKey?.otherId) + 1
        : 0;
      const limit = request.limit ?? list.length;
      const items = list.slice(startIndex, startIndex + limit);
      const lastEvaluatedKey =
        startIndex + limit < list.length && items.length > 0
          ? { edgeKey: request.edgeKey, otherId: items[items.length - 1].otherId }
          : undefined;

      return { items, lastEvaluatedKey };
    },
  });

  await ddbBackend.putEdge({ key: { from: "a", to: "b", relation: "owns" }, metadata: { weight: 1 } });
  await ddbBackend.putEdge({ key: { from: "a", to: "c", relation: "owns" }, metadata: { weight: 2 } });
  const ddbPage1 = await ddbBackend.getOutgoing("a", "owns", { limit: 1 });
  const ddbPage2 = await ddbBackend.getOutgoing("a", "owns", { limit: 1, cursor: ddbPage1.nextCursor });
  await ddbBackend.removeEdge({ from: "a", to: "b", relation: "owns" });
  const ddbAfterRemove = await ddbBackend.getOutgoing("a", "owns");

  setRelationalHandlerDependencies({ backend: inMemory });
  const handlerPut = await relationalHandler({
    action: "edge/put",
    edge: { key: { from: "x", to: "y", relation: "likes" } },
  });
  const handlerQuery = await relationalHandler({
    action: "edge/query",
    direction: "out",
    entityId: "x",
    relation: "likes",
    limit: 10,
  });

  return {
    outgoingPage1,
    outgoingPage2,
    incomingPage,
    relationalCursor,
    relationalCursorDecoded,
    ddbSchema: relationEdgesSchema,
    ddbKey: buildRelationEdgeDdbKey("a", "owns", "out", "b"),
    ddbItem: buildRelationEdgeDdbItem("a", "owns", "out", "b", { weight: 1 }),
    ddbPartitionKey: encodeRelationEdgePartitionKey("a", "owns", "out"),
    ddbPage1,
    ddbPage2,
    ddbAfterRemove,
    handlerPut,
    handlerQuery,
  };
};
