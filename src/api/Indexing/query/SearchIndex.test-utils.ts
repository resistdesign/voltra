import { indexDocument } from "../API";
import { qualifyIndexField } from "../fieldQualification";
import { FullTextMemoryBackend } from "../fulltext/FullTextMemoryBackend";
import { StructuredInMemoryBackend } from "../structured/StructuredInMemoryBackend";
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
