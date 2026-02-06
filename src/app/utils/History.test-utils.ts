import {
  buildHistoryPath,
  createMemoryHistory,
  parseHistoryPath,
} from "./History";

export const runMemoryHistoryNavigationScenario = () => {
  const history = createMemoryHistory("/app/books?view=list#top");
  const events: string[] = [];
  const unlisten = history.listen((location) => {
    events.push(buildHistoryPath(location));
  });

  const initial = {
    path: buildHistoryPath(history.location),
    length: history.length,
    index: history.index,
    key: history.location.key,
  };

  history.push("/app/books/42", { state: { from: "list" } });
  const afterPush = {
    path: buildHistoryPath(history.location),
    length: history.length,
    index: history.index,
    key: history.location.key,
    state: history.location.state as Record<string, string>,
  };

  history.replace("/app/books/42?view=detail", { state: { from: "detail" } });
  const afterReplace = {
    path: buildHistoryPath(history.location),
    length: history.length,
    index: history.index,
    key: history.location.key,
    state: history.location.state as Record<string, string>,
  };

  history.back();
  const afterBack = {
    path: buildHistoryPath(history.location),
    length: history.length,
    index: history.index,
    key: history.location.key,
  };

  history.forward();
  const afterForward = {
    path: buildHistoryPath(history.location),
    length: history.length,
    index: history.index,
    key: history.location.key,
  };

  history.go(-8);
  const afterGo = {
    path: buildHistoryPath(history.location),
    length: history.length,
    index: history.index,
    key: history.location.key,
  };

  unlisten();
  history.push("/done");

  return {
    initial,
    afterPush,
    afterReplace,
    afterBack,
    afterForward,
    afterGo,
    events,
    eventCount: events.length,
  };
};

export const runMemoryHistoryReplaceSearchScenario = () => {
  const history = createMemoryHistory("/catalog?lang=en");

  history.push("/catalog/books", { replaceSearch: false });
  const afterPushPreserve = buildHistoryPath(history.location);

  history.push("/catalog/movies", { replaceSearch: true });
  const afterPushReplace = buildHistoryPath(history.location);

  history.replace("/catalog/music?genre=jazz");
  const afterReplaceWithSearch = buildHistoryPath(history.location);

  history.push("/catalog/albums", { replaceSearch: false });
  const afterPushPreserveNewSearch = buildHistoryPath(history.location);

  return {
    afterPushPreserve,
    afterPushReplace,
    afterReplaceWithSearch,
    afterPushPreserveNewSearch,
  };
};

export const runHistoryPathParsingScenario = () => {
  const relative = parseHistoryPath("books/42?tab=info#top");
  const absolute = parseHistoryPath(
    "https://example.com/app/books/7?view=grid#section-1",
  );
  const empty = parseHistoryPath("");
  const built1 = buildHistoryPath(relative);
  const built2 = buildHistoryPath({
    path: "catalog",
    search: "lang=en",
    hash: "overview",
  });

  return {
    relative,
    absolute,
    empty,
    built1,
    built2,
  };
};
