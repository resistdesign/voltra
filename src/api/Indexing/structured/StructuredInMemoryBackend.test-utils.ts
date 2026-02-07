import { StructuredInMemoryBackend } from "./StructuredInMemoryBackend";
import { searchStructured } from "./SearchStructured";

export const runStructuredInMemoryBackendScenario = async () => {
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
    afterUpdateIds: afterUpdate.candidateIds,
    afterRemoveIds: afterRemove.candidateIds,
  };
};
