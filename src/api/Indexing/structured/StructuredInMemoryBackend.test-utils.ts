import { StructuredInMemoryBackend } from "./StructuredInMemoryBackend";
import { searchStructured } from "./SearchStructured";
import {
  setStructuredHandlerDependencies,
  structuredHandler,
} from "./Handlers";

const runStructuredInMemoryBackendScenario = async () => {
  const backend = new StructuredInMemoryBackend();

  await backend.write("1", { category: "news", tags: ["a", "b"], score: 10 });
  await backend.write("2", {
    category: "news",
    tags: ["b"],
    score: 20,
    model: "Honda",
  });
  await backend.write("3", { category: "blog", tags: ["c"], score: 5 });

  const news = await searchStructured(
    backend,
    { type: "term", field: "category", mode: "eq", value: "news" },
    { limit: 10 },
  );

  const tagsB = await searchStructured(
    backend,
    { type: "term", field: "tags", mode: "contains", value: "b" },
    { limit: 10 },
  );

  const scoreGte10 = await searchStructured(
    backend,
    { type: "gte", field: "score", value: 10 },
    { limit: 10 },
  );

  const scoreBetween = await searchStructured(
    backend,
    { type: "between", field: "score", lower: 6, upper: 15 },
    { limit: 10 },
  );

  const modelLikeHon = await searchStructured(
    backend,
    {
      and: [
        { type: "term", field: "model", mode: "contains", value: "__str__:h" },
        { type: "term", field: "model", mode: "contains", value: "__str__:o" },
        { type: "term", field: "model", mode: "contains", value: "__str__:n" },
        {
          type: "term",
          field: "model",
          mode: "contains",
          value: "__str__:ho",
        },
        {
          type: "term",
          field: "model",
          mode: "contains",
          value: "__str__:on",
        },
        {
          type: "term",
          field: "model",
          mode: "contains",
          value: "__str__:hon",
        },
      ],
    },
    { limit: 10 },
  );

  const modelLikeToy = await searchStructured(
    backend,
    {
      and: [
        { type: "term", field: "model", mode: "contains", value: "__str__:t" },
        { type: "term", field: "model", mode: "contains", value: "__str__:o" },
        { type: "term", field: "model", mode: "contains", value: "__str__:y" },
        {
          type: "term",
          field: "model",
          mode: "contains",
          value: "__str__:to",
        },
        {
          type: "term",
          field: "model",
          mode: "contains",
          value: "__str__:oy",
        },
        {
          type: "term",
          field: "model",
          mode: "contains",
          value: "__str__:toy",
        },
      ],
    },
    { limit: 10 },
  );

  const page1 = await searchStructured(
    backend,
    { type: "term", field: "category", mode: "eq", value: "news" },
    { limit: 1 },
  );
  const page2 = await searchStructured(
    backend,
    { type: "term", field: "category", mode: "eq", value: "news" },
    { limit: 1, cursor: page1.cursor },
  );
  const rangePage1 = await searchStructured(
    backend,
    { type: "gte", field: "score", value: 10 },
    { limit: 1 },
  );
  const rangePage2 = await searchStructured(
    backend,
    { type: "gte", field: "score", value: 10 },
    { limit: 1, cursor: rangePage1.cursor },
  );

  setStructuredHandlerDependencies({ reader: backend, writer: backend });
  const terminalHandlerResponse = await structuredHandler({
    action: "SearchStructured",
    where: { type: "term", field: "category", mode: "eq", value: "news" },
    limit: 1,
    cursor: page1.cursor,
  });

  await backend.write("1", { category: "archive", tags: ["a"], score: 11 });
  const afterUpdate = await searchStructured(
    backend,
    { type: "term", field: "category", mode: "eq", value: "news" },
    { limit: 10 },
  );

  await backend.write("2", {});
  const afterRemove = await searchStructured(
    backend,
    { type: "term", field: "category", mode: "eq", value: "news" },
    { limit: 10 },
  );

  return {
    newsIds: news.candidateIds,
    tagsBIds: tagsB.candidateIds,
    scoreGte10Ids: scoreGte10.candidateIds,
    scoreBetweenIds: scoreBetween.candidateIds,
    modelLikeHonIds: modelLikeHon.candidateIds,
    modelLikeToyIds: modelLikeToy.candidateIds,
    page1Ids: page1.candidateIds,
    page2Ids: page2.candidateIds,
    page2Cursor: page2.cursor ?? null,
    rangePage2Cursor: rangePage2.cursor ?? null,
    terminalHandlerBody: JSON.parse(terminalHandlerResponse.body),
    afterUpdateIds: afterUpdate.candidateIds,
    afterRemoveIds: afterRemove.candidateIds,
  };
};

export const runStructuredInMemoryBackendNewsIdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).newsIds;

export const runStructuredInMemoryBackendTagsBIdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).tagsBIds;

export const runStructuredInMemoryBackendScoreGte10IdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).scoreGte10Ids;

export const runStructuredInMemoryBackendScoreBetweenIdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).scoreBetweenIds;

export const runStructuredInMemoryBackendModelLikeHonIdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).modelLikeHonIds;

export const runStructuredInMemoryBackendModelLikeToyIdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).modelLikeToyIds;

export const runStructuredInMemoryBackendPage1IdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).page1Ids;

export const runStructuredInMemoryBackendPage2IdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).page2Ids;

export const runStructuredInMemoryBackendPage2CursorScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).page2Cursor;

export const runStructuredInMemoryBackendRangePage2CursorScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).rangePage2Cursor;

export const runStructuredInMemoryBackendTerminalHandlerBodyScenario =
  async () =>
    (await runStructuredInMemoryBackendScenario()).terminalHandlerBody;

export const runStructuredInMemoryBackendAfterUpdateIdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).afterUpdateIds;

export const runStructuredInMemoryBackendAfterRemoveIdsScenario = async () =>
  (await runStructuredInMemoryBackendScenario()).afterRemoveIds;

const collectAllPages = async (
  backend: StructuredInMemoryBackend,
  where: Parameters<typeof searchStructured>[1],
  options: Parameters<typeof searchStructured>[2],
) => {
  const ids: Array<string | number> = [];
  let cursor: string | undefined;

  do {
    const page = await searchStructured(backend, where, {
      ...options,
      cursor,
    });
    ids.push(...page.candidateIds);
    cursor = page.cursor;
  } while (cursor);

  return { ids, terminalCursor: cursor ?? null };
};

export const runStructuredCompoundPaginationReferenceScenario = async () => {
  const backend = new StructuredInMemoryBackend();
  await backend.write("1", { status: "public", age: 25, name: "Zed" });
  await backend.write("2", { status: "public", age: 50, name: "Amy" });
  await backend.write("3", { status: "private", age: 30, name: "Bea" });
  await backend.write("4", { status: "public", age: 30, name: "Cal" });
  await backend.write("5", { status: "public", age: 31, name: "Dee" });

  const ageRange = {
    type: "between" as const,
    field: "age",
    lower: 23,
    upper: 34,
  };
  const publicTerm = {
    type: "term" as const,
    field: "status",
    mode: "eq" as const,
    value: "public",
  };

  const andResult = await collectAllPages(
    backend,
    { and: [publicTerm, ageRange] },
    { limit: 1, backendPageSize: 2 },
  );
  const orResult = await collectAllPages(
    backend,
    { or: [publicTerm, ageRange] },
    { limit: 1, backendPageSize: 2 },
  );
  const sortedResult = await collectAllPages(backend, ageRange, {
    limit: 2,
    backendPageSize: 3,
    orderBy: { field: "name" },
  });
  const nestedAndOrResult = await collectAllPages(
    backend,
    {
      and: [
        {
          or: [
            publicTerm,
            { type: "term", field: "name", mode: "eq", value: "Bea" },
          ],
        },
        ageRange,
      ],
    },
    { limit: 1, backendPageSize: 2 },
  );

  return {
    andIds: andResult.ids,
    andTerminalCursor: andResult.terminalCursor,
    orIds: orResult.ids,
    orUniqueCount: new Set(orResult.ids).size,
    orTerminalCursor: orResult.terminalCursor,
    sortedIds: sortedResult.ids,
    sortedTerminalCursor: sortedResult.terminalCursor,
    nestedAndOrIds: nestedAndOrResult.ids,
  };
};
