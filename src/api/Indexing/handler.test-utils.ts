import { FullTextMemoryBackend } from "./fulltext/memoryBackend";
import {
  indexDocument,
  removeDocument,
  searchExact,
  searchLossy,
  setIndexBackend,
} from "./api";
import { handler, setHandlerDependencies } from "./handler";

export const runIndexingHandlerScenario = async () => {
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
    query: "\"hello world\"",
    indexField: "text",
  });

  const handlerIndex = await handler({
    action: "indexDocument",
    document: { id: 4, text: "hello world again" },
  });

  const handlerExactResponse = await handler({
    action: "searchExact",
    query: "\"hello world\"",
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
