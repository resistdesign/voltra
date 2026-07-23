import type {
  AttributeMap,
  BatchGetItemInput,
  BatchWriteItemInput,
  DynamoQueryClient,
  GetItemInput,
  PutItemInput,
  QueryInput,
} from "./ddb/Types";
import { INDEX_TABLE_KIND_ATTRIBUTE } from "./IndexTable";
import { IndexMutationCoordinator } from "./ddb/IndexMutationCoordinator";
import { FullTextDdbBackend } from "./fulltext/FullTextDdbBackend";
import {
  RelationalDdbBackend,
  createRelationEdgesDdbDependencies,
} from "./rel/RelationalDdb";
import { StructuredDdbBackend } from "./structured/StructuredDdbBackend";
import { searchStructured } from "./structured/SearchStructured";
import type { StructuredOccupancyFieldMap } from "./structured/StructuredOccupancy";
import { replaceFullTextDocument } from "./API";
import { tokenize, tokenizeLossyTrigrams } from "./tokenize";

const keyOf = (item: AttributeMap): string =>
  JSON.stringify([item.pk, item.sk]);

/** Minimal DynamoDB semantics used to exercise all unified index backends. */
class InMemoryDynamoIndexClient implements DynamoQueryClient {
  private readonly tables = new Map<string, Map<string, AttributeMap>>();
  readonly touchedTables = new Set<string>();
  readonly batchKinds: string[][] = [];

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
          const item = { ...request.PutRequest.Item };
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
          table.delete(keyOf(request.DeleteRequest.Key));
        }
      }
    }
    return {};
  }

  async batchGetItem(input: BatchGetItemInput) {
    const responses: Record<string, AttributeMap[]> = {};
    for (const [tableName, request] of Object.entries(input.RequestItems)) {
      const table = this.table(tableName);
      responses[tableName] = request.Keys.flatMap((key) => {
        const item = table.get(keyOf(key));
        return item ? [{ ...item }] : [];
      });
    }
    return { Responses: responses };
  }

  async getItem(input: GetItemInput) {
    const item = this.table(input.TableName).get(keyOf(input.Key));
    return item ? { Item: { ...item } } : {};
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
    table.set(keyOf(input.Item), { ...input.Item });
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
      const cursorIndex = items.findIndex(
        (item) =>
          keyOf(item) === keyOf(input.ExclusiveStartKey as AttributeMap),
      );
      items = items.slice(cursorIndex + 1);
    }
    const limit = input.Limit ?? items.length;
    const page = items.slice(0, limit);
    const last = page[page.length - 1];
    return {
      Items: page.map((item) => ({ ...item })),
      LastEvaluatedKey:
        page.length < items.length && last
          ? { pk: last.pk, sk: last.sk }
          : undefined,
    };
  }

  snapshot(tableName: string): AttributeMap[] {
    return Array.from(this.table(tableName).values());
  }
}

export const runUnifiedIndexTableIntegrationScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const structured = new StructuredDdbBackend({ client, table });
  const fullText = new FullTextDdbBackend({ client, table });
  const relationships = new RelationalDdbBackend(
    createRelationEdgesDdbDependencies({ client, table }),
  );

  await structured.writer.write("doc#1", {
    "Article#age": 23,
    "Article#status": "PUBLIC",
  });
  await structured.writer.write("doc/2", {
    "Article#age": 34,
    "Article#status": "PUBLIC",
  });
  await fullText.addLossyPosting("voltra#link", "Article#title", "doc#1");
  await fullText.addExactPositions(
    "voltra#link",
    "Article#title",
    "doc#1",
    [0, 2],
  );
  await relationships.putEdge({
    key: { from: "user#1", to: "doc/2", relation: "likes#saved" },
  });

  const term = await structured.reader.terms.query(
    "Article#status",
    "eq",
    "PUBLIC",
  );
  const range = await structured.reader.ranges.between("Article#age", 23, 34);
  const lossy = await fullText.loadLossyPostings(
    "voltra#link",
    "Article#title",
  );
  const exact = await fullText.loadExactPositions(
    "voltra#link",
    "Article#title",
    "doc#1",
  );
  const related = await relationships.getOutgoing("user#1", "likes#saved");
  const kinds = client
    .snapshot(table.tableName)
    .sort((left, right) =>
      String(left[INDEX_TABLE_KIND_ATTRIBUTE]).localeCompare(
        String(right[INDEX_TABLE_KIND_ATTRIBUTE]),
      ),
    )
    .reduce<Record<string, number>>((counts, item) => {
      const kind = String(item[INDEX_TABLE_KIND_ATTRIBUTE]);
      counts[kind] = (counts[kind] ?? 0) + 1;
      return counts;
    }, {});

  return {
    touchedTables: Array.from(client.touchedTables),
    termIds: term.candidateIds,
    rangeIds: range.candidateIds,
    lossy,
    exact,
    related: related.edges.map((edge) => edge.key.to),
    kinds,
  };
};

export const runUnifiedIndexTableNumericCursorScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const fullText = new FullTextDdbBackend({ client, table });
  await fullText.addLossyPosting("number", "Record.id", 0);
  await fullText.addLossyPosting("number", "Record.id", 2);
  const first = await fullText.queryLossyPostingsPage("number", "Record.id", {
    limit: 1,
  });
  const second = await fullText.queryLossyPostingsPage("number", "Record.id", {
    limit: 1,
    exclusiveStartDocId: first.lastEvaluatedDocId,
  });
  return { first, second };
};

export const runUnifiedIndexTableTypedIdentityScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const structured = new StructuredDdbBackend({ client, table });
  const fullText = new FullTextDdbBackend({ client, table });

  await structured.writer.write(123, { "Record.status": "ACTIVE" });
  await structured.writer.write("123", { "Record.status": "ACTIVE" });
  await fullText.addLossyPosting("same", "Record.value", 123);
  await fullText.addLossyPosting("same", "Record.value", "123");
  await fullText.addExactPositions("same", "Record.value", 123, [1]);
  await fullText.addExactPositions("same", "Record.value", "123", [2]);

  const terms = await structured.reader.terms.query(
    "Record.status",
    "eq",
    "ACTIVE",
  );
  const postings = await fullText.loadLossyPostings("same", "Record.value");

  return {
    terms: terms.candidateIds,
    postings,
    numericPositions: await fullText.loadExactPositions(
      "same",
      "Record.value",
      123,
    ),
    stringPositions: await fullText.loadExactPositions(
      "same",
      "Record.value",
      "123",
    ),
    structuredStateCount: client
      .snapshot(table.tableName)
      .filter((item) => item.kind === "sd").length,
  };
};

export const runUnifiedIndexTableOccupancyScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const structured = new StructuredDdbBackend({ client, table });
  const occupancyFields: StructuredOccupancyFieldMap = {
    age: { type: "number" },
    name: { type: "string" },
  };
  await structured.occupancyMaintenance.beginRebuild("g1");
  await structured.writer.write(
    "a",
    { age: 23, name: "Zoe" },
    { occupancyFields },
  );
  await structured.writer.write(
    "b",
    { age: 34, name: "Amy" },
    { occupancyFields },
  );
  await structured.writer.write("c", { age: 28 }, { occupancyFields });
  await structured.writer.write(
    "d",
    { age: 50, name: "Bob" },
    { occupancyFields },
  );
  await structured.occupancyMaintenance.activateRebuild();

  const first = await searchStructured(
    structured.reader,
    { type: "between", field: "age", lower: 23, upper: 34 },
    {
      limit: 2,
      orderBy: { field: "name", optional: true },
      occupancyFields,
    },
  );
  const second = await searchStructured(
    structured.reader,
    { type: "between", field: "age", lower: 23, upper: 34 },
    {
      limit: 2,
      cursor: first.cursor,
      orderBy: { field: "name", optional: true },
      occupancyFields,
    },
  );
  const kinds = client
    .snapshot(table.tableName)
    .reduce<Record<string, number>>((counts, item) => {
      const kind = String(item.kind);
      counts[kind] = (counts[kind] ?? 0) + 1;
      return counts;
    }, {});
  return {
    ids: [...first.candidateIds, ...second.candidateIds],
    strategies: [first.diagnostics?.strategy, second.diagnostics?.strategy],
    occupancyCells: kinds.so,
    missingRows: kinds.sm,
  };
};

export const runUnifiedIndexTableGenerationScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const structured = new StructuredDdbBackend({ client, table });
  await structured.occupancyMaintenance.beginRebuild("g2");
  const building = await structured.occupancyMaintenance.getState();
  await structured.occupancyMaintenance.activateRebuild();
  const active = await structured.occupancyMaintenance.getState();
  return {
    building: {
      active: building.activeGeneration ?? null,
      building: building.buildingGeneration,
    },
    active: {
      active: active.activeGeneration,
      building: active.buildingGeneration ?? null,
    },
  };
};

export const runUnifiedIndexTableLiveRebuildScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const structured = new StructuredDdbBackend({ client, table });
  const occupancyFields: StructuredOccupancyFieldMap = {
    age: { type: "number" },
    name: { type: "string" },
  };
  await structured.occupancyMaintenance.beginRebuild("g1");
  await structured.writer.write(
    "historical",
    { age: 34, name: "Amy" },
    { occupancyFields },
  );
  const beforeInitialActivation = await searchStructured(
    structured.reader,
    { type: "between", field: "age", lower: 23, upper: 34 },
    { limit: 10, orderBy: { field: "name" }, occupancyFields },
  );
  await structured.occupancyMaintenance.activateRebuild();
  await structured.occupancyMaintenance.beginRebuild("g2");
  await structured.occupancyMaintenance.backfillDocument({
    docId: "historical",
    fields: { age: 34, name: "Amy" },
    occupancyFields,
  });
  await structured.writer.write(
    "live",
    { age: 23, name: "Zoe" },
    { occupancyFields },
  );
  const generationCounts = client
    .snapshot(table.tableName)
    .filter((item) => item.kind === "so")
    .reduce<Record<string, number>>((counts, item) => {
      const generation = String(item.generation);
      counts[generation] = (counts[generation] ?? 0) + 1;
      return counts;
    }, {});
  await structured.occupancyMaintenance.activateRebuild();
  const page = await searchStructured(
    structured.reader,
    { type: "between", field: "age", lower: 23, upper: 34 },
    { limit: 10, orderBy: { field: "name" }, occupancyFields },
  );
  const retiredCount = await structured.occupancyMaintenance.retireGeneration(
    "g1",
    ["age", "name"],
  );
  return {
    beforeInitialActivationStrategy:
      beforeInitialActivation.diagnostics?.strategy,
    generationCounts,
    ids: page.candidateIds,
    strategy: page.diagnostics?.strategy,
    retiredCount,
    retiredCellsRemaining: client
      .snapshot(table.tableName)
      .filter((item) => item.kind === "so" && item.generation === "g1").length,
  };
};

export const runUnifiedIndexTableDescendingTieScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const structured = new StructuredDdbBackend({ client, table });
  const occupancyFields: StructuredOccupancyFieldMap = {
    age: { type: "number" },
    name: { type: "string" },
  };
  await structured.occupancyMaintenance.beginRebuild("g1");
  await structured.writer.write(
    "a",
    { age: 23, name: "Same" },
    { occupancyFields },
  );
  await structured.writer.write(
    "b",
    { age: 24, name: "Same" },
    { occupancyFields },
  );
  await structured.occupancyMaintenance.activateRebuild();
  const page = await searchStructured(
    structured.reader,
    { type: "between", field: "age", lower: 20, upper: 29 },
    {
      limit: 10,
      orderBy: { field: "name", reverse: true },
      occupancyFields,
    },
  );
  return page.candidateIds;
};

export const runUnifiedIndexTableStaleBackfillMissingScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const structured = new StructuredDdbBackend({ client, table });
  const occupancyFields: StructuredOccupancyFieldMap = {
    age: { type: "number" },
    name: { type: "string" },
  };
  await structured.occupancyMaintenance.beginRebuild("g1");
  await structured.writer.write(
    "doc",
    { age: 23, name: "Amy" },
    { occupancyFields },
  );
  await structured.occupancyMaintenance.activateRebuild();
  await structured.occupancyMaintenance.beginRebuild("g2");
  await structured.occupancyMaintenance.backfillDocument({
    docId: "doc",
    fields: { age: 23, name: "Amy" },
    occupancyFields,
  });
  await structured.occupancyMaintenance.backfillDocument({
    docId: "doc",
    fields: { age: 23 },
    occupancyFields,
  });
  await structured.occupancyMaintenance.activateRebuild();
  const page = await searchStructured(
    structured.reader,
    { type: "between", field: "age", lower: 20, upper: 29 },
    {
      limit: 10,
      orderBy: { field: "name", optional: true },
      occupancyFields,
    },
  );
  return page.candidateIds;
};

export const runUnifiedIndexTableCoordinatedMutationScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const mutationCoordinator = new IndexMutationCoordinator(client);
  const structured = new StructuredDdbBackend({
    client,
    table,
    mutationCoordinator,
  });
  const fullText = new FullTextDdbBackend({
    client,
    table,
    mutationCoordinator,
  });
  const relationships = new RelationalDdbBackend(
    createRelationEdgesDdbDependencies({
      client,
      table,
      mutationCoordinator,
    }),
  );
  const occupancyFields: StructuredOccupancyFieldMap = {
    age: { type: "number" },
    name: { type: "string" },
  };
  await structured.occupancyMaintenance.beginRebuild("g1");
  await structured.occupancyMaintenance.activateRebuild();

  await mutationCoordinator.run(async () => {
    await Promise.all([
      structured.writer.write(
        "doc",
        { age: 23, name: "Amy" },
        { occupancyFields },
      ),
      fullText.writeDocument(
        { id: "doc", title: "hi" },
        "id",
        "title",
        "Article#title",
      ),
      relationships.putEdge({
        key: { from: "user", to: "doc", relation: "likes" },
      }),
    ]);
  });

  const crossFamilyBatches = client.batchKinds.map((batch) => [...batch]);
  client.batchKinds.length = 0;
  await mutationCoordinator.run(async () => {
    await mutationCoordinator.write(
      Array.from({ length: 60 }, (_, index) => ({
        tableName: table.tableName,
        request: {
          PutRequest: {
            Item: { pk: `cap-${index}`, sk: "state", kind: "st" },
          },
        },
      })),
    );
  });
  const capBatchSizes = client.batchKinds.map((batch) => batch.length);

  client.batchKinds.length = 0;
  let releaseFirst!: () => void;
  let markFirstStarted!: () => void;
  const firstStarted = new Promise<void>((resolve) => {
    markFirstStarted = resolve;
  });
  const releaseFirstPromise = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const first = mutationCoordinator.run(async () => {
    await mutationCoordinator.write([
      {
        tableName: table.tableName,
        request: {
          PutRequest: { Item: { pk: "concurrent-a", sk: "state", kind: "st" } },
        },
      },
    ]);
    markFirstStarted();
    await releaseFirstPromise;
  });
  await firstStarted;
  const second = mutationCoordinator.run(async () => {
    await mutationCoordinator.write([
      {
        tableName: table.tableName,
        request: {
          PutRequest: { Item: { pk: "concurrent-b", sk: "state", kind: "st" } },
        },
      },
    ]);
  });
  await second;
  releaseFirst();
  await first;

  return {
    batchCount: crossFamilyBatches.length,
    batchSize: crossFamilyBatches[0]?.length,
    kinds: Array.from(new Set(crossFamilyBatches.flat())).sort(),
    maxBatchSize: Math.max(...crossFamilyBatches.map((batch) => batch.length)),
    capBatchSizes,
    concurrentBatchSizes: client.batchKinds.map((batch) => batch.length),
  };
};

export const runUnifiedIndexTableCleanupScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const structured = new StructuredDdbBackend({ client, table });
  const fullText = new FullTextDdbBackend({ client, table });

  await structured.writer.write("cleanup", {
    "Record.status": "OLD",
    "Record.score": 1,
  });
  await structured.writer.write("cleanup", {
    "Record.status": "NEW",
    "Record.score": 2,
  });
  await fullText.writeDocument(
    { id: "cleanup", "Record.text": "alpha" },
    "id",
    "Record.text",
  );
  await fullText.writeDocument(
    { id: "cleanup", "Record.text": "beta" },
    "id",
    "Record.text",
  );

  const oldTerms = await structured.reader.terms.query(
    "Record.status",
    "eq",
    "OLD",
  );
  const newTerms = await structured.reader.terms.query(
    "Record.status",
    "eq",
    "NEW",
  );
  const oldRange = await structured.reader.ranges.between("Record.score", 1, 1);
  const newRange = await structured.reader.ranges.between("Record.score", 2, 2);

  return {
    oldTerms: oldTerms.candidateIds,
    newTerms: newTerms.candidateIds,
    oldRange: oldRange.candidateIds,
    newRange: newRange.candidateIds,
    oldPositions:
      (await fullText.loadExactPositions("alpha", "Record.text", "cleanup")) ??
      null,
    newPositions: await fullText.loadExactPositions(
      "beta",
      "Record.text",
      "cleanup",
    ),
  };
};

export const runUnifiedIndexTableLegacyFullTextUpgradeScenario = async () => {
  const client = new InMemoryDynamoIndexClient();
  const table = { tableName: "UnifiedIndex" };
  const fullText = new FullTextDdbBackend({ client, table });
  const docId = "legacy";
  const indexField = "Record#text";
  const previousText = "legacy alpha";
  const nextText = "modern beta";

  for (const token of new Set(tokenizeLossyTrigrams(previousText).tokens)) {
    await fullText.addLossyPosting(token, indexField, docId);
  }
  const positionsByToken = new Map<string, number[]>();
  for (const token of tokenize(previousText).tokens) {
    const positions = positionsByToken.get(token) ?? [];
    positions.push(positionsByToken.size);
    positionsByToken.set(token, positions);
  }
  for (const [token, positions] of positionsByToken) {
    await fullText.addExactPositions(token, indexField, docId, positions);
  }

  const mirrorsBefore = client
    .snapshot(table.tableName)
    .filter((item) => item.kind === "fm").length;
  await replaceFullTextDocument({
    backend: fullText,
    previousDocument: { id: docId, text: previousText },
    nextDocument: { id: docId, text: nextText },
    primaryField: "id",
    indexField: "text",
    indexFieldQualified: indexField,
  });

  const previousLossy = new Set(tokenizeLossyTrigrams(previousText).tokens);
  const nextLossy = new Set(tokenizeLossyTrigrams(nextText).tokens);
  const removedLossyToken = [...previousLossy].find(
    (token) => !nextLossy.has(token),
  )!;
  const addedLossyToken = [...nextLossy].find(
    (token) => !previousLossy.has(token),
  )!;

  return {
    mirrorsBefore,
    mirrorsAfter: client
      .snapshot(table.tableName)
      .filter((item) => item.kind === "fm").length,
    oldExact:
      (await fullText.loadExactPositions("legacy", indexField, docId)) ?? null,
    newExact: await fullText.loadExactPositions("modern", indexField, docId),
    oldLossy: await fullText.loadLossyPostings(removedLossyToken, indexField),
    newLossy: await fullText.loadLossyPostings(addedLossyToken, indexField),
  };
};
