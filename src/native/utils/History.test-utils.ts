import { createMemoryHistory } from "../../app/utils/History";
import {
  createNativeBackHandler,
  createNativeHistory,
  mapNativeURLToPath,
} from "./History";

export const runNativeHistoryScenario = async () => {
  let incomingListener: ((url: string) => void) | undefined;
  let unsubscribeCallCount = 0;

  const history = createNativeHistory({
    initialPath: "/fallback",
    adapter: {
      getInitialURL: async () => "voltra://host/app/books/42?tab=summary#top",
      subscribe: (listener) => {
        incomingListener = listener;
        return () => {
          incomingListener = undefined;
          unsubscribeCallCount += 1;
        };
      },
    },
  });

  const beforeStart = {
    path: history.location.path,
    fullPath: `${history.location.path}${history.location.search ?? ""}${history.location.hash ?? ""}`,
    length: history.length,
    index: history.index,
  };

  await history.start();
  const afterStart = {
    path: history.location.path,
    fullPath: `${history.location.path}${history.location.search ?? ""}${history.location.hash ?? ""}`,
    length: history.length,
    index: history.index,
  };

  incomingListener?.("voltra://host/app/books/99?tab=detail");
  const afterIncomingReplace = {
    path: history.location.path,
    fullPath: `${history.location.path}${history.location.search ?? ""}${history.location.hash ?? ""}`,
    length: history.length,
    index: history.index,
  };

  history.push("/manual/path");
  const afterManualPush = {
    path: history.location.path,
    fullPath: `${history.location.path}${history.location.search ?? ""}${history.location.hash ?? ""}`,
    length: history.length,
    index: history.index,
  };

  history.stop();
  const listenerActiveAfterStop = Boolean(incomingListener);

  return {
    beforeStart,
    afterStart,
    afterIncomingReplace,
    afterManualPush,
    unsubscribeCallCount,
    listenerActiveAfterStop,
  };
};

export const runNativeHistoryPushModeScenario = async () => {
  let incomingListener: ((url: string) => void) | undefined;

  const history = createNativeHistory({
    initialPath: "/",
    onIncomingURL: "push",
    adapter: {
      getInitialURL: async () => null,
      subscribe: (listener) => {
        incomingListener = listener;
        return () => {
          incomingListener = undefined;
        };
      },
    },
  });

  await history.start();
  incomingListener?.("voltra://host/a");
  incomingListener?.("voltra://host/b?x=1");

  const afterIncomingPush = {
    fullPath: `${history.location.path}${history.location.search ?? ""}${history.location.hash ?? ""}`,
    length: history.length,
    index: history.index,
  };

  history.back();
  const afterBack = {
    fullPath: `${history.location.path}${history.location.search ?? ""}${history.location.hash ?? ""}`,
    length: history.length,
    index: history.index,
  };

  history.stop();

  return {
    afterIncomingPush,
    afterBack,
  };
};

export const runNativeBackHandlerScenario = () => {
  const history = createMemoryHistory("/home");
  history.push("/details");

  const backHandler = createNativeBackHandler(history);
  const firstHandle = backHandler.handle();
  const secondHandle = backHandler.handle();

  return {
    firstHandle,
    secondHandle,
    finalPath: `${history.location.path}${history.location.search ?? ""}${history.location.hash ?? ""}`,
    finalIndex: history.index,
  };
};

export const runNativeURLMappingScenario = () => {
  return {
    absolute: mapNativeURLToPath("voltra://host/app/books/7?tab=grid#section"),
    relative: mapNativeURLToPath("/app/books/7?tab=grid#section"),
  };
};
