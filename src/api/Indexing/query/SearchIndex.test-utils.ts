import { indexDocument } from "../API";
import { qualifyIndexField } from "../fieldQualification";
import { FullTextMemoryBackend } from "../../ORM/drivers/InMemoryDataItemDBDriver/Indexing/FullTextMemoryBackend";
import { StructuredInMemoryBackend } from "../../ORM/drivers/InMemoryDataItemDBDriver/Indexing/StructuredInMemoryBackend";
import { searchIndex } from "./SearchIndex";
import {
  createIndexBackend,
  IndexQueryError,
  type IndexExpression,
} from "./Types";

const typeName = "Record";
const field = (name: string) => qualifyIndexField(typeName, name);

const records = [
  {
    id: "1",
    title: "distributed runtime",
    state: "published",
    score: 20,
  },
  { id: "2", title: "queue guide", state: "draft", score: 10 },
  { id: "3", title: "distributed queue", state: "draft", score: 30 },
  { id: "4", title: "distributed manual", state: "published", score: 5 },
];

const buildBackend = async () => {
  const values = new StructuredInMemoryBackend();
  const text = new FullTextMemoryBackend();
  for (const record of records) {
    await values.write(record.id, {
      [field("state")]: record.state,
      [field("score")]: record.score,
    });
    await indexDocument({
      backend: text,
      document: record,
      primaryField: "id",
      indexField: "title",
      indexFieldQualified: field("title"),
    });
  }
  return createIndexBackend({ values, valueWriter: values, text });
};

const publishedAndDistributed: IndexExpression = {
  and: [
    {
      type: "term",
      field: field("state"),
      mode: "eq",
      value: "published",
    },
    {
      type: "text",
      field: field("title"),
      mode: "caseInsensitiveContains",
      query: "distributed",
    },
  ],
};

const publishedWithMinimumScore: IndexExpression = {
  and: [
    {
      type: "gte",
      field: field("score"),
      value: 0,
    },
    {
      type: "term",
      field: field("state"),
      mode: "eq",
      value: "published",
    },
  ],
};

const buildInstrumentedBackend = async () => {
  const backend = await buildBackend();
  const values = backend.values;
  const documents = values.documents;
  const counters = {
    termQueries: 0,
    rangeQueries: 0,
    documentGets: 0,
    documentBatches: 0,
  };
  const instrumented = createIndexBackend({
    valueWriter: backend.valueWriter,
    text: backend.text,
    values: {
      terms: {
        query: async (queryField, mode, value, options) => {
          counters.termQueries += 1;
          return values.terms.query(queryField, mode, value, options);
        },
      },
      ranges: {
        between: async (queryField, lower, upper, options) => {
          counters.rangeQueries += 1;
          return values.ranges.between(queryField, lower, upper, options);
        },
        gte: async (queryField, lower, options) => {
          counters.rangeQueries += 1;
          return values.ranges.gte(queryField, lower, options);
        },
        lte: async (queryField, upper, options) => {
          counters.rangeQueries += 1;
          return values.ranges.lte(queryField, upper, options);
        },
        all: async (queryField, options) => {
          counters.rangeQueries += 1;
          return values.ranges.all(queryField, options);
        },
      },
      ...(documents
        ? {
            documents: {
              get: async (docId) => {
                counters.documentGets += 1;
                return documents.get(docId);
              },
              ...(documents.getMany
                ? {
                    getMany: async (docIds) => {
                      counters.documentBatches += 1;
                      return documents.getMany?.(docIds) ?? new Map();
                    },
                  }
                : {}),
            },
          }
        : {}),
      ...(values.tokenizer ? { tokenizer: values.tokenizer } : {}),
      ...(values.occupancy ? { occupancy: values.occupancy } : {}),
      ...(values.missing ? { missing: values.missing } : {}),
    },
  });
  return { backend: instrumented, counters };
};

const runScenario = async () => {
  const backend = await buildBackend();
  const mixedAnd = await searchIndex(backend, publishedAndDistributed, {
    limit: 10,
  });
  const mixedOr = await searchIndex(
    backend,
    {
      or: [
        {
          type: "term",
          field: field("state"),
          mode: "eq",
          value: "published",
        },
        {
          type: "text",
          field: field("title"),
          mode: "phrase",
          query: "queue",
        },
      ],
    },
    { limit: 10 },
  );
  const firstPage = await searchIndex(backend, publishedAndDistributed, {
    limit: 1,
  });
  const secondPage = await searchIndex(backend, publishedAndDistributed, {
    limit: 1,
    cursor: firstPage.cursor,
  });
  const ordered = await searchIndex(backend, publishedAndDistributed, {
    limit: 10,
    orderBy: { field: field("score") },
  });
  let staleCursorCode: string | undefined;
  try {
    await searchIndex(
      backend,
      {
        type: "term",
        field: field("state"),
        mode: "eq",
        value: "draft",
      },
      { cursor: firstPage.cursor },
    );
  } catch (error) {
    staleCursorCode =
      error instanceof IndexQueryError ? error.code : String(error);
  }

  return {
    mixedAndIds: mixedAnd.candidateIds,
    mixedOrIds: mixedOr.candidateIds,
    mixedRequiresVerification: mixedAnd.requiresCanonicalVerification,
    mixedDiagnostics: {
      mixed: mixedAnd.diagnostics.mixed,
      strategy: mixedAnd.diagnostics.strategy,
    },
    pagination: {
      first: firstPage.candidateIds,
      second: secondPage.candidateIds,
      terminal: secondPage.cursor ?? null,
    },
    orderedIds: ordered.candidateIds,
    staleCursorCode,
  };
};

let scenario: ReturnType<typeof runScenario> | undefined;
const getScenario = () => (scenario ??= runScenario());

export const runUnifiedIndexMixedAndScenario = async () =>
  (await getScenario()).mixedAndIds;
export const runUnifiedIndexMixedOrScenario = async () =>
  (await getScenario()).mixedOrIds;
export const runUnifiedIndexVerificationScenario = async () =>
  (await getScenario()).mixedRequiresVerification;
export const runUnifiedIndexDiagnosticsScenario = async () =>
  (await getScenario()).mixedDiagnostics;
export const runUnifiedIndexPaginationScenario = async () =>
  (await getScenario()).pagination;
export const runUnifiedIndexOrderingScenario = async () =>
  (await getScenario()).orderedIds;
export const runUnifiedIndexStaleCursorScenario = async () =>
  (await getScenario()).staleCursorCode;

export const runUnifiedIndexStructuredAndPlanningScenario = async () => {
  const instrumented = await buildInstrumentedBackend();
  const result = await searchIndex(
    instrumented.backend,
    publishedWithMinimumScore,
    { limit: 10 },
  );
  return {
    ids: result.candidateIds,
    driverKind: result.diagnostics.driverKind,
    ...instrumented.counters,
  };
};

export const runUnifiedIndexStructuredAndOrderedPaginationScenario =
  async () => {
    const backend = await buildBackend();
    const first = await searchIndex(backend, publishedWithMinimumScore, {
      limit: 1,
      orderBy: { field: field("score") },
    });
    const second = await searchIndex(backend, publishedWithMinimumScore, {
      limit: 1,
      cursor: first.cursor,
      orderBy: { field: field("score") },
    });
    return {
      first: first.candidateIds,
      second: second.candidateIds,
      terminal: second.cursor ?? null,
    };
  };


export const runUnifiedIndexStructuredAndOrderedPlanningScenario = async () => {
  const instrumented = await buildInstrumentedBackend();
  const result = await searchIndex(
    instrumented.backend,
    publishedWithMinimumScore,
    {
      limit: 1,
      orderBy: { field: field("score") },
    },
  );
  return {
    ids: result.candidateIds,
    driverKind: result.diagnostics.driverKind,
    ...instrumented.counters,
  };
};


export const runUnifiedIndexCompoundOccupancyPreservedScenario = async () => {
  const values = new StructuredInMemoryBackend();
  const occupancyFields = {
    [field("state")]: { type: "string" as const },
    [field("score")]: { type: "number" as const },
  };
  for (const record of records) {
    await values.write(
      record.id,
      {
        [field("state")]: record.state,
        [field("score")]: record.score,
      },
      { occupancyFields },
    );
  }

  let occupancyQueries = 0;
  const occupancy = values.occupancy;
  const backend = createIndexBackend({
    valueWriter: values,
    values: {
      terms: values.terms,
      ranges: values.ranges,
      documents: values.documents,
      missing: values.missing,
      occupancy: {
        getActiveGeneration: occupancy.getActiveGeneration,
        query: async (...args) => {
          occupancyQueries += 1;
          return occupancy.query(...args);
        },
      },
    },
  });
  const result = await searchIndex(backend, publishedWithMinimumScore, {
    limit: 10,
    orderBy: { field: field("score") },
    occupancyFields,
  });

  return {
    ids: result.candidateIds,
    driverKind: result.diagnostics.driverKind,
    occupancyQueriesUsed: occupancyQueries > 0,
  };
};
