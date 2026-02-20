import { buildHistoryPath, createMemoryHistory } from "./History";
import { createRouteAdapterFromHistory } from "./RouteHistory";

const getRouteHistoryBridgeScenario = () => {
  const history = createMemoryHistory("/app/books/42?tab=summary");
  const adapter = createRouteAdapterFromHistory(history);
  const events: string[] = [];
  const unlisten = adapter.subscribe((path) => {
    events.push(path);
  });

  const initialAdapterPath = adapter.getPath();
  const initialHistoryPath = buildHistoryPath(history.location);

  adapter.push?.("/app/books/99");
  const afterAdapterPush = {
    adapterPath: adapter.getPath(),
    historyPath: buildHistoryPath(history.location),
  };

  history.push("/app/books/100?tab=debug");
  const afterHistoryPush = {
    adapterPath: adapter.getPath(),
    historyPath: buildHistoryPath(history.location),
    canGoBack: adapter.canGoBack?.(),
  };

  adapter.replace?.("/app/books/101");
  const afterAdapterReplace = {
    adapterPath: adapter.getPath(),
    historyPath: buildHistoryPath(history.location),
  };

  adapter.back?.();
  const afterAdapterBack = {
    adapterPath: adapter.getPath(),
    historyPath: buildHistoryPath(history.location),
    canGoBack: adapter.canGoBack?.(),
  };

  unlisten();
  history.push("/app/books/102");

  return {
    initialAdapterPath,
    initialHistoryPath,
    afterAdapterPush,
    afterHistoryPush,
    afterAdapterReplace,
    afterAdapterBack,
    events,
  };
};

export const runRouteHistoryInitialAdapterPathScenario = () =>
  getRouteHistoryBridgeScenario().initialAdapterPath;

export const runRouteHistoryInitialHistoryPathScenario = () =>
  getRouteHistoryBridgeScenario().initialHistoryPath;

export const runRouteHistoryAfterAdapterPushScenario = () =>
  getRouteHistoryBridgeScenario().afterAdapterPush;

export const runRouteHistoryAfterHistoryPushScenario = () =>
  getRouteHistoryBridgeScenario().afterHistoryPush;

export const runRouteHistoryAfterAdapterReplaceScenario = () =>
  getRouteHistoryBridgeScenario().afterAdapterReplace;

export const runRouteHistoryAfterAdapterBackScenario = () =>
  getRouteHistoryBridgeScenario().afterAdapterBack;

export const runRouteHistoryEventsScenario = () =>
  getRouteHistoryBridgeScenario().events;
