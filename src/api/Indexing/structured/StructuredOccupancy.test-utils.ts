import { searchStructured } from "./SearchStructured";
import { StructuredInMemoryBackend } from "./StructuredInMemoryBackend";
import {
  encodeStructuredCriterionChunk,
  type StructuredOccupancyFieldMap,
} from "./StructuredOccupancy";
import type { Where } from "./Types";

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
  backend.beginOccupancyRebuild("g1");
  backend.activateOccupancyRebuild();
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
      orderBy: { field: "name", reverse },
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
  backend.beginOccupancyRebuild("g2");
  backend.activateOccupancyRebuild();
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
  backend.beginOccupancyRebuild("g1");
  backend.activateOccupancyRebuild();
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
  backend.beginOccupancyRebuild("g1");
  backend.activateOccupancyRebuild();
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

export const runStructuredOptionalWithoutGenerationScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  await backend.write("1", { age: 23 }, { occupancyFields });
  try {
    await searchStructured(backend, ageRange, {
      limit: 10,
      orderBy: { field: "name", optional: true },
      occupancyFields,
    });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return "NO_ERROR";
};
