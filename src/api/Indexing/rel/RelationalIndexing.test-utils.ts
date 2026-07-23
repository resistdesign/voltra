import { RelationalInMemoryBackend } from "./RelationalInMemoryBackend";
import { decodeRelationalCursor, encodeRelationalCursor } from "./Cursor";
import {
  RelationalDdbBackend,
  type RelationEdgesDdbItem,
  buildRelationEdgeDdbItem,
  buildRelationEdgeDdbKey,
  encodeRelationEdgePartitionKey,
  relationEdgesSchema,
} from "./RelationalDdb";
import {
  handler as relationalHandler,
  setRelationalHandlerDependencies,
} from "./Handlers";

export const runRelationalIndexingScenario = async () => {
  const inMemoryBackend = new RelationalInMemoryBackend<{ weight: number }>();
  inMemoryBackend.putEdge({
    key: { from: "a", to: "b", relation: "owns" },
    metadata: { weight: 1 },
  });
  inMemoryBackend.putEdge({
    key: { from: "a", to: "c", relation: "owns" },
    metadata: { weight: 2 },
  });

  const outgoingPage1 = inMemoryBackend.getOutgoing("a", "owns", { limit: 1 });
  const outgoingPage2 = inMemoryBackend.getOutgoing("a", "owns", {
    limit: 1,
    cursor: outgoingPage1.nextCursor,
  });
  const incomingPage = inMemoryBackend.getIncoming("b", "owns");

  const relationalCursor = encodeRelationalCursor({
    lastId: "b",
    continuationToken: "token-1",
  });
  const relationalCursorDecoded = decodeRelationalCursor(relationalCursor);

  const store = new Map<string, RelationEdgesDdbItem<{ weight: number }>[]>();
  const ddbBackend = new RelationalDdbBackend<{ weight: number }>({
    putEdges: async (items) => {
      for (const item of items) {
        const list = store.get(item.pk) ?? [];
        const filtered = list.filter((entry) => entry.sk !== item.sk);
        filtered.push(item);
        filtered.sort((a, b) => a.sk.localeCompare(b.sk));
        store.set(item.pk, filtered);
      }
    },
    deleteEdges: async (keys) => {
      for (const key of keys) {
        const list = store.get(key.pk) ?? [];
        const filtered = list.filter((entry) => entry.sk !== key.sk);
        if (filtered.length === 0) {
          store.delete(key.pk);
        } else {
          store.set(key.pk, filtered);
        }
      }
    },
    queryEdges: async (request) => {
      const list = store.get(request.edgeKey) ?? [];
      const startIndex = request.exclusiveStartKey
        ? list.findIndex(
            (entry) => entry.sk === request.exclusiveStartKey?.sk,
          ) + 1
        : 0;
      const limit = request.limit ?? list.length;
      const items = list.slice(startIndex, startIndex + limit);
      const lastEvaluatedKey =
        startIndex + limit < list.length && items.length > 0
          ? {
              pk: request.edgeKey,
              sk: items[items.length - 1].sk,
            }
          : undefined;

      return { items, lastEvaluatedKey };
    },
  });

  await ddbBackend.putEdge({
    key: { from: "a", to: "b", relation: "owns" },
    metadata: { weight: 1 },
  });
  await ddbBackend.putEdge({
    key: { from: "a", to: "c", relation: "owns" },
    metadata: { weight: 2 },
  });
  const ddbPage1 = await ddbBackend.getOutgoing("a", "owns", { limit: 1 });
  const ddbPage2 = await ddbBackend.getOutgoing("a", "owns", {
    limit: 1,
    cursor: ddbPage1.nextCursor,
  });
  await ddbBackend.removeEdge({ from: "a", to: "b", relation: "owns" });
  const ddbAfterRemove = await ddbBackend.getOutgoing("a", "owns");

  setRelationalHandlerDependencies({ backend: inMemoryBackend });
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
    ddbItem: buildRelationEdgeDdbItem("a", "owns", "out", "b", {
      weight: 1,
    }),
    ddbPartitionKey: encodeRelationEdgePartitionKey("a", "owns", "out"),
    ddbPage1,
    ddbPage2,
    ddbAfterRemove,
    handlerPut,
    handlerQuery,
  };
};

export const runRelationalIndexingOutgoingPage1Scenario = async () =>
  (await runRelationalIndexingScenario()).outgoingPage1;

export const runRelationalIndexingOutgoingPage2Scenario = async () =>
  (await runRelationalIndexingScenario()).outgoingPage2;

export const runRelationalIndexingIncomingPageScenario = async () =>
  (await runRelationalIndexingScenario()).incomingPage;

export const runRelationalIndexingCursorScenario = async () =>
  (await runRelationalIndexingScenario()).relationalCursor;

export const runRelationalIndexingCursorDecodedScenario = async () =>
  (await runRelationalIndexingScenario()).relationalCursorDecoded;

export const runRelationalIndexingDdbSchemaScenario = async () =>
  (await runRelationalIndexingScenario()).ddbSchema;

export const runRelationalIndexingDdbKeyScenario = async () =>
  (await runRelationalIndexingScenario()).ddbKey;

export const runRelationalIndexingDdbItemScenario = async () =>
  (await runRelationalIndexingScenario()).ddbItem;

export const runRelationalIndexingDdbPartitionKeyScenario = async () =>
  (await runRelationalIndexingScenario()).ddbPartitionKey;

export const runRelationalIndexingDdbPage1Scenario = async () =>
  (await runRelationalIndexingScenario()).ddbPage1;

export const runRelationalIndexingDdbPage2Scenario = async () =>
  (await runRelationalIndexingScenario()).ddbPage2;

export const runRelationalIndexingDdbAfterRemoveScenario = async () =>
  (await runRelationalIndexingScenario()).ddbAfterRemove;

export const runRelationalIndexingHandlerPutScenario = async () =>
  (await runRelationalIndexingScenario()).handlerPut;

export const runRelationalIndexingHandlerQueryScenario = async () =>
  (await runRelationalIndexingScenario()).handlerQuery;
