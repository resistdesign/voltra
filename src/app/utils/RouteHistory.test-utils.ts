import { buildHistoryPath, createMemoryHistory } from "./History";
import { createRouteAdapterFromHistory } from "./RouteHistory";

export const runRouteHistoryBridgeScenario = () => {
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
  };

  adapter.replace?.("/app/books/101");
  const afterAdapterReplace = {
    adapterPath: adapter.getPath(),
    historyPath: buildHistoryPath(history.location),
  };

  unlisten();
  history.push("/app/books/102");

  return {
    initialAdapterPath,
    initialHistoryPath,
    afterAdapterPush,
    afterHistoryPush,
    afterAdapterReplace,
    events,
  };
};
