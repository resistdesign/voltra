import { searchStructured } from "./SearchStructured";
import { StructuredInMemoryBackend } from "./StructuredInMemoryBackend";
import { StructuredDdbBackend } from "./StructuredDdbBackend";
import { InMemoryDynamoQueryClient } from "../ddb/InMemoryDynamoQueryClient.test-utils";
import {
  encodeStructuredCriterionChunk,
  type StructuredOccupancyFieldMap,
} from "./StructuredOccupancy";
import type { Where } from "./Types";
import { rebuildStructuredOccupancy } from "../../ORM/rebuildStructuredOccupancy";

const occupancyFields: StructuredOccupancyFieldMap = {
  age: { type: "number" },
  score: { type: "number" },
  name: { type: "string" },
};

const seed = async () => {
  const backend = new StructuredInMemoryBackend();
  await backend.write(
    "1",
    { age: 23, score: 75, name: "Zoe" },
    { occupancyFields },
  );
  await backend.write(
    "2",
    { age: 34, score: 60, name: "Amy" },
    { occupancyFields },
  );
  await backend.write(
    "3",
    { age: 22, score: 10, name: "Kim" },
    { occupancyFields },
  );
  await backend.write(
    "4",
    { age: 35, score: 95, name: "Bob" },
    { occupancyFields },
  );
  await backend.write(
    "5",
    { age: 30, score: 80, name: "Cal" },
    { occupancyFields },
  );
  await backend.write("6", { age: 28, score: 78 }, { occupancyFields });
  await backend.write(
    "7",
    { age: 25, score: 90, name: "kim" },
    { occupancyFields },
  );
  return backend;
};

const ageRange: Where = {
  type: "between",
  field: "age",
  lower: 23,
  upper: 34,
};

const collect = async (
  backend: StructuredInMemoryBackend,
  where: Where,
  reverse = false,
) => {
  const ids: Array<string | number> = [];
  const strategies: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await searchStructured(backend, where, {
      limit: 2,
      cursor,
      orderBy: { field: "name", reverse, optional: true },
      occupancyFields,
    });
    ids.push(...page.candidateIds);
    strategies.push(page.diagnostics?.strategy ?? "none");
    cursor = page.cursor;
  } while (cursor);
  return { ids, strategies };
};

export const runStructuredOccupancyChunkCodecScenario = () => ({
  sameThreeCharacterPrefix:
    encodeStructuredCriterionChunk("Kimberly", { type: "string" }) ===
    encodeStructuredCriterionChunk("Kimono", { type: "string" }),
  adjacentPrefixDiffers:
    encodeStructuredCriterionChunk("Kimberly", { type: "string" }) !==
    encodeStructuredCriterionChunk("Kinsley", { type: "string" }),
  preservesCase:
    encodeStructuredCriterionChunk("Kimberly", { type: "string" }) !==
    encodeStructuredCriterionChunk("kimberly", { type: "string" }),
  shortBucketIsExact:
    encodeStructuredCriterionChunk("Ki", { type: "string" }) !==
    encodeStructuredCriterionChunk("Kim", { type: "string" }),
  unicodeCodePointSafe:
    encodeStructuredCriterionChunk("😀ab-one", { type: "string" }) ===
    encodeStructuredCriterionChunk("😀ab-two", { type: "string" }),
  ordinaryDecade:
    encodeStructuredCriterionChunk(22.4, { type: "number" }) ===
    encodeStructuredCriterionChunk(29.9, { type: "number" }),
  ordinaryNextDecade:
    encodeStructuredCriterionChunk(29.9, { type: "number" }) !==
    encodeStructuredCriterionChunk(30, { type: "number" }),
  decimalUnit:
    encodeStructuredCriterionChunk(22.4, { type: "number", decimal: true }) ===
    encodeStructuredCriterionChunk(22.9, { type: "number", decimal: true }),
  decimalNextUnit:
    encodeStructuredCriterionChunk(22.9, { type: "number", decimal: true }) !==
    encodeStructuredCriterionChunk(23, { type: "number", decimal: true }),
  negativeDecade:
    encodeStructuredCriterionChunk(-1, { type: "number" }) ===
    encodeStructuredCriterionChunk(-10, { type: "number" }),
});

export const runStructuredOccupancyAscendingScenario = async () =>
  collect(await seed(), ageRange);

export const runStructuredOccupancyDescendingScenario = async () =>
  collect(await seed(), ageRange, true);

export const runStructuredOccupancyAndOrScenario = async () => {
  const backend = await seed();
  const andResult = await collect(backend, {
    and: [ageRange, { type: "between", field: "score", lower: 70, upper: 89 }],
  });
  const orResult = await collect(backend, {
    or: [ageRange, { type: "gte", field: "score", value: 90 }],
  });
  return { andIds: andResult.ids, orIds: orResult.ids };
};

export const runStructuredOccupancyOptionalUpdateScenario = async () => {
  const backend = await seed();
  const before = await collect(backend, ageRange);
  await backend.write(
    "6",
    { age: 28, score: 78, name: "Aaron" },
    { occupancyFields },
  );
  const after = await collect(backend, ageRange);
  return { before: before.ids, after: after.ids };
};

export const runStructuredOccupancyStaleCursorScenario = async () => {
  const backend = await seed();
  const first = await searchStructured(backend, ageRange, {
    limit: 1,
    orderBy: { field: "name" },
    occupancyFields,
  });
  await backend.beginOccupancyRebuild("g2");
  await backend.activateOccupancyRebuild();
  const stale = await searchStructured(backend, ageRange, {
    limit: 1,
    cursor: first.cursor,
    orderBy: { field: "name" },
    occupancyFields,
  });
  return {
    firstIds: first.candidateIds,
    staleIds: stale.candidateIds,
    staleCursor: stale.cursor ?? null,
  };
};

export const runStructuredOccupancyFallbackScenario = async () => {
  const backend = await seed();
  const page = await searchStructured(
    backend,
    { type: "term", field: "name", mode: "contains", value: "__str__:a" },
    {
      limit: 10,
      orderBy: { field: "age" },
      occupancyFields,
    },
  );
  return page.candidateIds;
};

export const runStructuredOccupancyBudgetFallbackScenario = async () => {
  const backend = await seed();
  const dependencies = {
    terms: backend.terms,
    ranges: backend.ranges,
    documents: backend.documents,
    missing: backend.missing,
    occupancy: {
      getActiveGeneration: async () => "g1",
      query: async () => ({
        cells: Array.from({ length: 2_001 }, (_, index) => ({
          sortToken: `token-${index}`,
          sortValue: `value-${index}`,
        })),
      }),
    },
  };
  const page = await searchStructured(dependencies, ageRange, {
    limit: 3,
    orderBy: { field: "name" },
    occupancyFields,
  });
  return {
    ids: page.candidateIds,
    strategy: page.diagnostics?.strategy,
    fallbackReason: page.diagnostics?.fallbackReason,
  };
};

export const runStructuredOccupancyTieScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  await backend.write("1", { age: 23, name: "Same" }, { occupancyFields });
  await backend.write("2", { age: 24, name: "Same" }, { occupancyFields });
  await backend.write("3", { age: 25, name: "Other" }, { occupancyFields });
  const ascending = await collect(backend, ageRange);
  const descending = await collect(backend, ageRange, true);
  return { ascending: ascending.ids, descending: descending.ids };
};

export const runStructuredOccupancySparseScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  for (let index = 0; index < 50; index += 1) {
    await backend.write(
      `outside-${index}`,
      { age: 500, score: index, name: `Outside ${index}` },
      { occupancyFields },
    );
  }
  await backend.write(
    "inside-a",
    { age: 23, score: 1, name: "Amy" },
    { occupancyFields },
  );
  await backend.write(
    "inside-z",
    { age: 34, score: 2, name: "Zoe" },
    { occupancyFields },
  );
  const page = await searchStructured(backend, ageRange, {
    limit: 10,
    orderBy: { field: "name" },
    occupancyFields,
  });
  return {
    ids: page.candidateIds,
    cellsRead: page.diagnostics?.occupancyCellsRead,
    occupiedSortTokens: page.diagnostics?.occupiedSortTokens,
  };
};

export const runStructuredOccupancyNormalCrudScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  await backend.write("1", { age: 23 }, { occupancyFields });
  const created = await searchStructured(backend, ageRange, {
    limit: 10,
    orderBy: { field: "name", optional: true },
    occupancyFields,
  });
  await backend.write("1", { age: 23, name: "Amy" }, { occupancyFields });
  const updated = await searchStructured(backend, ageRange, {
    limit: 10,
    orderBy: { field: "name", optional: true },
    occupancyFields,
  });
  await backend.write("1", {}, { occupancyFields, deleted: true });
  const deleted = await searchStructured(backend, ageRange, {
    limit: 10,
    orderBy: { field: "name", optional: true },
    occupancyFields,
  });
  return {
    activeGeneration: await backend.occupancy.getActiveGeneration(),
    created: created.candidateIds,
    createdStrategy: created.diagnostics?.strategy,
    updated: updated.candidateIds,
    updatedStrategy: updated.diagnostics?.strategy,
    deleted: deleted.candidateIds,
  };
};

export const runStructuredOccupancyTerminalCursorScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  await backend.write("only", { age: 23, name: "Amy" }, { occupancyFields });
  const page = await searchStructured(backend, ageRange, {
    limit: 1,
    orderBy: { field: "name" },
    occupancyFields,
  });
  return {
    ids: page.candidateIds,
    cursor: page.cursor ?? null,
  };
};

export const runStructuredOccupancyStaleMissingScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  await backend.write("present", { age: 23, name: "Amy" }, { occupancyFields });
  const page = await searchStructured(
    {
      terms: backend.terms,
      ranges: backend.ranges,
      occupancy: backend.occupancy,
      documents: backend.documents,
      missing: {
        all: async () => ({ candidateIds: ["present"] }),
      },
    },
    ageRange,
    {
      limit: 10,
      orderBy: { field: "name", optional: true },
      occupancyFields,
    },
  );
  return page.candidateIds;
};

export const runStructuredSameFieldSeekScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  await backend.write("low", { age: 10 }, { occupancyFields });
  await backend.write("inside", { age: 23 }, { occupancyFields });
  await backend.write("high", { age: 50 }, { occupancyFields });
  let betweenCalls = 0;
  let allCalls = 0;
  const page = await searchStructured(
    {
      terms: backend.terms,
      documents: backend.documents,
      ranges: {
        ...backend.ranges,
        between: async (...args) => {
          betweenCalls += 1;
          return backend.ranges.between(...args);
        },
        all: async (...args) => {
          allCalls += 1;
          return backend.ranges.all(...args);
        },
      },
    },
    ageRange,
    {
      limit: 10,
      orderBy: { field: "age" },
      occupancyFields,
    },
  );
  return { ids: page.candidateIds, betweenCalls, allCalls };
};

export const runStructuredMissingTypedIdOrderScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  await backend.write("1", { age: 23 }, { occupancyFields });
  await backend.write(1, { age: 23 }, { occupancyFields });
  const page = await searchStructured(backend, ageRange, {
    limit: 10,
    orderBy: { field: "name", optional: true },
    occupancyFields,
  });
  return page.candidateIds;
};

export const runStructuredOccupancyRebuildWorkflowScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  const reindexed: string[] = [];
  const result = await rebuildStructuredOccupancy({
    controller: backend.occupancyMaintenance,
    generation: "g2",
    typeNames: ["Person", "Person", "Car"],
    itemsPerPage: 25,
    orm: {
      reindexStoredType: async (typeName, config) => {
        reindexed.push(`${typeName}:${config?.itemsPerPage}`);
        if (typeName === "Person") {
          await backend.write(
            "person",
            { age: 23, name: "Amy" },
            { occupancyFields },
          );
        }
        return { processedCount: typeName === "Person" ? 1 : 2 };
      },
    },
  });
  const active = await backend.occupancy.getActiveGeneration();
  const repeated = await rebuildStructuredOccupancy({
    controller: backend.occupancyMaintenance,
    generation: "g2",
    typeNames: ["Person", "Car"],
    orm: { reindexStoredType: async () => ({ processedCount: 99 }) },
  });
  return { result, reindexed, active, repeated };
};

const orderedRecords = (records: Array<Record<string, unknown>>) =>
  records.slice().sort((left, right) => {
    const leftKey = `${String(left.pk)}\u0000${String(left.sk)}`;
    const rightKey = `${String(right.pk)}\u0000${String(right.sk)}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });

const orderedMapEntries = (
  records: ReadonlyMap<string, Record<string, unknown>>,
) =>
  Array.from(records).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );

const countKinds = (records: Array<Record<string, unknown>>) =>
  records.reduce<Record<string, number>>((counts, record) => {
    const kind = String(record.kind);
    counts[kind] = (counts[kind] ?? 0) + 1;
    return counts;
  }, {});

export const runStructuredInMemoryDynamoParityScenario = async () => {
  const memory = new StructuredInMemoryBackend();
  const dynamoClient = new InMemoryDynamoQueryClient();
  const dynamoTable = "ParityIndex";
  const parityOccupancyFields: StructuredOccupancyFieldMap = {
    age: { type: "number" },
    name: { type: "string" },
  };
  const dynamo = new StructuredDdbBackend({
    client: dynamoClient,
    table: { tableName: dynamoTable },
  });
  const writeBoth = async (
    docId: string,
    fields: Record<string, string | number>,
    deleted = false,
  ) => {
    await Promise.all([
      memory.write(docId, fields, {
        occupancyFields: parityOccupancyFields,
        deleted,
      }),
      dynamo.writer.write(docId, fields, {
        occupancyFields: parityOccupancyFields,
        deleted,
      }),
    ]);
  };

  await writeBoth("a", { age: 23, name: "Amy" });
  await writeBoth("b", { age: 25 });
  const missingAfterCreate = memory
    .snapshotIndexRecords()
    .filter((record) => record.kind === "sm");
  await writeBoth("b", { age: 25, name: "Zoe" });
  await writeBoth("a", {}, true);

  const memoryBefore = orderedRecords(memory.snapshotIndexRecords());
  const dynamoBefore = orderedRecords(dynamoClient.snapshot(dynamoTable));
  const memoryMapBefore = memory.snapshotIndexRecordMap();
  const dynamoMapBefore = dynamoClient.snapshotMap(dynamoTable);
  const mutableSnapshot = memory.snapshotIndexRecords();
  const mutableDocument = mutableSnapshot.find(
    (record) => record.kind === "sd" && record.docId === "b",
  );
  if (mutableDocument) {
    (mutableDocument.fields as Record<string, unknown>).age = 999;
  }
  const protectedDocument = memory
    .snapshotIndexRecords()
    .find((record) => record.kind === "sd" && record.docId === "b");

  await Promise.all([
    memory.occupancyMaintenance.beginRebuild("g2"),
    dynamo.occupancyMaintenance.beginRebuild("g2"),
  ]);
  const backfillDocument = {
    docId: "b",
    fields: { age: 25, name: "Zoe" },
    occupancyFields: parityOccupancyFields,
  };
  await Promise.all([
    memory.occupancyMaintenance.backfillDocument(backfillDocument),
    dynamo.occupancyMaintenance.backfillDocument(backfillDocument),
  ]);
  await writeBoth("c", { age: 27, name: "Cal" });
  await Promise.all([
    memory.occupancyMaintenance.activateRebuild(),
    dynamo.occupancyMaintenance.activateRebuild(),
  ]);

  const query = {
    type: "between" as const,
    field: "age",
    lower: 20,
    upper: 29,
  };
  const options = {
    limit: 1,
    orderBy: { field: "name" },
    occupancyFields: parityOccupancyFields,
  };
  const memoryFirst = await searchStructured(memory, query, options);
  const dynamoFirst = await searchStructured(dynamo.reader, query, options);
  await writeBoth("c", {}, true);
  const memorySecond = await searchStructured(memory, query, {
    ...options,
    cursor: memoryFirst.cursor,
  });
  const dynamoSecond = await searchStructured(dynamo.reader, query, {
    ...options,
    cursor: dynamoFirst.cursor,
  });

  const memoryAfter = orderedRecords(memory.snapshotIndexRecords());
  const dynamoAfter = orderedRecords(dynamoClient.snapshot(dynamoTable));
  const project = (record: Record<string, unknown>) => {
    if (record.kind === "sd") {
      return {
        kind: record.kind,
        docId: record.docId,
        fields: record.fields,
        version: record.version,
      };
    }
    if (record.kind === "sr") {
      return {
        kind: record.kind,
        field: record.field,
        value: record.value,
        docId: record.docId,
      };
    }
    if (record.kind === "so") {
      return {
        kind: record.kind,
        generation: record.generation,
        criterionField: record.criterionField,
        sortField: record.sortField,
        sortValue: record.sortValue,
      };
    }
    return undefined;
  };

  return {
    before: {
      rawRecordsEqual:
        JSON.stringify(memoryBefore) === JSON.stringify(dynamoBefore),
      rawMapsEqual:
        JSON.stringify(orderedMapEntries(memoryMapBefore)) ===
        JSON.stringify(orderedMapEntries(dynamoMapBefore)),
      snapshotIsolated:
        (protectedDocument?.fields as Record<string, unknown>)?.age === 25,
      kinds: countKinds(memoryBefore),
      missingLifecycle: {
        created: missingAfterCreate,
        afterUpdate: memoryBefore.filter((record) => record.kind === "sm")
          .length,
      },
      documents: memoryBefore
        .map(project)
        .filter(Boolean)
        .filter((record) => (record as { kind: string }).kind === "sd"),
      equalityTerms: memoryBefore
        .filter((record) => record.kind === "st" && record.mode === "eq")
        .map(({ kind, field, value, mode, docId }) => ({
          kind,
          field,
          value,
          mode,
          docId,
        })),
      ranges: memoryBefore
        .map(project)
        .filter(Boolean)
        .filter((record) => (record as { kind: string }).kind === "sr"),
      occupancy: memoryBefore
        .map(project)
        .filter(Boolean)
        .filter((record) => (record as { kind: string }).kind === "so"),
    },
    afterRebuild: {
      rawRecordsEqual:
        JSON.stringify(memoryAfter) === JSON.stringify(dynamoAfter),
      kinds: countKinds(memoryAfter),
      generationState: await memory.occupancyMaintenance.getState(),
      firstIdsEqual:
        JSON.stringify(memoryFirst.candidateIds) ===
        JSON.stringify(dynamoFirst.candidateIds),
      firstCursorEqual: memoryFirst.cursor === dynamoFirst.cursor,
      secondIdsEqual:
        JSON.stringify(memorySecond.candidateIds) ===
        JSON.stringify(dynamoSecond.candidateIds),
      secondCursorEqual: memorySecond.cursor === dynamoSecond.cursor,
      ids: [...memoryFirst.candidateIds, ...memorySecond.candidateIds],
      strategies: [
        memoryFirst.diagnostics?.strategy,
        memorySecond.diagnostics?.strategy,
      ],
    },
  };
};
