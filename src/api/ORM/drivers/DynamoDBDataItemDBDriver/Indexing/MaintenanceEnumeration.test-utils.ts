import { INDEX_ITEM_KINDS } from "../../../../Indexing/IndexTable";
import { listDynamoIndexItemsByKind } from "./MaintenanceEnumeration";
import type {
  BatchGetItemInput,
  DynamoQueryClient,
  QueryInput,
  ScanInput,
} from "./Types";

const createNoopClient = (): DynamoQueryClient => ({
  batchWriteItem: async () => ({ UnprocessedItems: {} }),
  batchGetItem: async () => ({ Responses: {}, UnprocessedKeys: {} }),
  getItem: async () => ({}),
  putItem: async () => ({}),
  query: async () => ({ Items: [] }),
  scan: async () => ({ Items: [] }),
});

export const runMaintenanceKindQueryScenario = async () => {
  const queryInputs: QueryInput[] = [];
  const batchInputs: BatchGetItemInput[] = [];
  let scanCalls = 0;
  const base = createNoopClient();
  const client: DynamoQueryClient = {
    ...base,
    query: async (input) => {
      queryInputs.push(input);
      return {
        Items: [
          {
            kind: INDEX_ITEM_KINDS.structuredDocument,
            pk: "v1#sd#d#s#doc-1",
            sk: "state",
          },
        ],
        LastEvaluatedKey: {
          kind: INDEX_ITEM_KINDS.structuredDocument,
          pk: "v1#sd#d#s#doc-1",
          sk: "state",
        },
      };
    },
    batchGetItem: async (input) => {
      batchInputs.push(input);
      return {
        Responses: {
          Index: [
            {
              kind: INDEX_ITEM_KINDS.structuredDocument,
              pk: "v1#sd#d#s#doc-1",
              sk: "state",
              docId: "doc-1",
              fields: { "Book#title": "Health" },
              version: 3,
            },
          ],
        },
        UnprocessedKeys: {},
      };
    },
    scan: async () => {
      scanCalls += 1;
      return { Items: [] };
    },
  };

  const page = await listDynamoIndexItemsByKind({
    client,
    table: {
      tableName: "Index",
      maintenanceIndexName: "KindPkMaintenanceIndex",
    },
    kind: INDEX_ITEM_KINDS.structuredDocument,
    limit: 25,
    hydrateBaseItems: true,
  });
  const query = queryInputs[0];
  const batch = batchInputs[0]?.RequestItems.Index;

  return {
    strategy: page.strategy,
    queryIndexName: query?.IndexName,
    queryCondition: query?.KeyConditionExpression,
    queryKind: query?.ExpressionAttributeValues[":kind"],
    batchConsistentRead: batch?.ConsistentRead,
    batchKeyCount: batch?.Keys.length,
    itemDocId: page.items[0]?.docId,
    cursorKind: page.cursor?.kind,
    scanCalls,
  };
};

export const runMaintenanceKindScanFallbackScenario = async () => {
  const scanInputs: ScanInput[] = [];
  let queryCalls = 0;
  const base = createNoopClient();
  const client: DynamoQueryClient = {
    ...base,
    query: async () => {
      queryCalls += 1;
      return { Items: [] };
    },
    scan: async (input) => {
      scanInputs.push(input);
      return {
        Items: [
          {
            kind: INDEX_ITEM_KINDS.fullTextDocumentMirror,
            pk: "v1#fm#d#s#doc-1",
            sk: "f#Book%23title",
          },
        ],
      };
    },
  };

  const page = await listDynamoIndexItemsByKind({
    client,
    table: { tableName: "Index" },
    kind: INDEX_ITEM_KINDS.fullTextDocumentMirror,
    limit: 10,
  });
  const scan = scanInputs[0];

  return {
    strategy: page.strategy,
    scanFilter: scan?.FilterExpression,
    scanKind: scan?.ExpressionAttributeValues?.[":kind"],
    consistentRead: scan?.ConsistentRead,
    itemCount: page.items.length,
    queryCalls,
  };
};
