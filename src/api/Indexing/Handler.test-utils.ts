import { FullTextMemoryBackend } from "./fulltext/FullTextMemoryBackend";
import {
  indexDocument,
  removeDocument,
  searchExact,
  searchLossy,
  setIndexBackend,
} from "./API";
import { handler, setHandlerDependencies } from "./Handler";

const runIndexingHandlerScenario = async () => {
  const backend = new FullTextMemoryBackend();
  setIndexBackend(backend);
  setHandlerDependencies({ backend });

  const documents = [
    { id: 1, text: "hello world" },
    { id: 2, text: "hello there" },
    { id: 3, text: "worldly matters" },
  ];

  await Promise.all(
    documents.map((document) =>
      indexDocument({ document, primaryField: "id", indexField: "text" }),
    ),
  );

  const apiLossyFirst = await searchLossy({
    query: "hello",
    indexField: "text",
    limit: 1,
  });
  const apiLossySecond = await searchLossy({
    query: "hello",
    indexField: "text",
    limit: 1,
    cursor: apiLossyFirst.nextCursor,
  });
  const apiExact = await searchExact({
    query: '"hello world"',
    indexField: "text",
  });

  const handlerIndex = await handler({
    action: "indexDocument",
    document: { id: 4, text: "hello world again" },
  });

  const handlerExactResponse = await handler({
    action: "searchExact",
    query: '"hello world"',
    indexField: "text",
  });
  const handlerExact = JSON.parse(handlerExactResponse.body);

  const handlerRemove = await handler({
    action: "removeDocument",
    document: { id: 2, text: "hello there" },
  });

  const handlerLossyResponse = await handler({
    action: "searchLossy",
    query: "hello",
    indexField: "text",
  });
  const handlerLossy = JSON.parse(handlerLossyResponse.body);

  await removeDocument({
    document: { id: 3, text: "worldly matters" },
    primaryField: "id",
    indexField: "text",
  });

  const apiLossyAfterRemove = await searchLossy({
    query: "worldly",
    indexField: "text",
  });

  return {
    apiLossyFirst,
    apiLossySecond,
    apiExact,
    handlerIndex,
    handlerExact,
    handlerRemove,
    handlerLossy,
    apiLossyAfterRemove,
  };
};

export const runIndexingHandlerApiLossyFirstScenario = async () =>
  (await runIndexingHandlerScenario()).apiLossyFirst;

export const runIndexingHandlerApiLossySecondScenario = async () =>
  (await runIndexingHandlerScenario()).apiLossySecond;

export const runIndexingHandlerApiExactScenario = async () =>
  (await runIndexingHandlerScenario()).apiExact;

export const runIndexingHandlerHandlerIndexScenario = async () =>
  (await runIndexingHandlerScenario()).handlerIndex;

export const runIndexingHandlerHandlerExactScenario = async () =>
  (await runIndexingHandlerScenario()).handlerExact;

export const runIndexingHandlerHandlerRemoveScenario = async () =>
  (await runIndexingHandlerScenario()).handlerRemove;

export const runIndexingHandlerHandlerLossyScenario = async () =>
  (await runIndexingHandlerScenario()).handlerLossy;

export const runIndexingHandlerApiLossyAfterRemoveScenario = async () =>
  (await runIndexingHandlerScenario()).apiLossyAfterRemove;
