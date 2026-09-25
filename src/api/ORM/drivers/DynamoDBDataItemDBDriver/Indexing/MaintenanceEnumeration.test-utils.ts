import { VOLTRA_INDEX_MAINTENANCE_INDEX_NAME } from "../../../../../common/IndexingInfrastructure";
import { INDEX_ITEM_KINDS } from "../../../../Indexing/IndexTable";
import { listDynamoIndexItemsByKind } from "./MaintenanceEnumeration";
import type {
  BatchGetItemInput,
  DynamoQueryClient,
  QueryInput,
} from "./Types";

const createNoopClient = (): DynamoQueryClient => ({
  batchWriteItem: async () => ({ UnprocessedItems: {} }),
  batchGetItem: async () => ({ Responses: {}, UnprocessedKeys: {} }),
  getItem: async () => ({}),
  putItem: async () => ({}),
  query: async () => ({ Items: [] }),
});

export const runMaintenanceKindQueryScenario = async () => {
  const queryInputs: QueryInput[] = [];
  const batchInputs: BatchGetItemInput[] = [];
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
  };

  const page = await listDynamoIndexItemsByKind({
    client,
    table: {
      tableName: "Index",
    },
    kind: INDEX_ITEM_KINDS.structuredDocument,
    limit: 25,
    hydrateBaseItems: true,
  });
  const query = queryInputs[0];
  const batch = batchInputs[0]?.RequestItems.Index;

  return {
    queryIndexName: query?.IndexName,
    expectedIndexName: VOLTRA_INDEX_MAINTENANCE_INDEX_NAME,
    queryCondition: query?.KeyConditionExpression,
    queryKind: query?.ExpressionAttributeValues[":kind"],
    batchConsistentRead: batch?.ConsistentRead,
    batchKeyCount: batch?.Keys.length,
    itemDocId: page.items[0]?.docId,
    cursorKind: page.cursor?.kind,
  };
};

export const runMaintenanceKindKeysOnlyScenario = async () => {
  const queryInputs: QueryInput[] = [];
  const client: DynamoQueryClient = {
    ...createNoopClient(),
    query: async (input) => {
      queryInputs.push(input);
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

  return {
    queryIndexName: queryInputs[0]?.IndexName,
    queryKind: queryInputs[0]?.ExpressionAttributeValues[":kind"],
    itemCount: page.items.length,
    itemPk: page.items[0]?.pk,
  };
};


export const runMaintenanceKindProbeScenario = async () => {
  const queryInputs: QueryInput[] = [];
  const client: DynamoQueryClient = {
    ...createNoopClient(),
    query: async (input) => {
      queryInputs.push(input);
      return { Items: [] };
    },
  };

  await listDynamoIndexItemsByKind({
    client,
    table: { tableName: "Index" },
    kind: INDEX_ITEM_KINDS.structuredDocument,
    probe: 0.5,
    limit: 10,
  });

  await listDynamoIndexItemsByKind({
    client,
    table: { tableName: "Index" },
    kind: INDEX_ITEM_KINDS.structuredDocument,
    probe: 0.75,
    cursor: {
      kind: INDEX_ITEM_KINDS.structuredDocument,
      pk: "v1#sd#d#s#existing",
      sk: "state",
    },
    limit: 10,
  });

  return {
    probeCondition: queryInputs[0]?.KeyConditionExpression,
    probePartitionKey:
      queryInputs[0]?.ExpressionAttributeValues[":probePk"],
    cursorCondition: queryInputs[1]?.KeyConditionExpression,
    cursorExclusiveStartKey: queryInputs[1]?.ExclusiveStartKey?.pk,
    cursorIgnoredProbe:
      queryInputs[1]?.ExpressionAttributeValues[":probePk"] === undefined,
  };
};
