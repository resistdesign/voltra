import {
  createHistoryBackHandler,
  createMemoryHistory,
} from "../../app/utils/History";
import {
  type NativeBackHandlerLike,
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

  const backHandler = createHistoryBackHandler(history);
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

export const runNativeHistoryLateInitialURLDoesNotOverrideScenario = async () => {
  let incomingListener: ((url: string) => void) | undefined;

  const createDelayedInitialURLAdapter = () => {
    let resolveInitialURL: ((url: string | null) => void) | undefined;

    return {
      resolveInitialURL: (url: string | null) => {
        resolveInitialURL?.(url);
      },
      adapter: {
        getInitialURL: async () =>
          new Promise<string | null>((resolve) => {
            resolveInitialURL = resolve;
          }),
        subscribe: (listener: (url: string) => void) => {
          incomingListener = listener;
          return () => {
            incomingListener = undefined;
          };
        },
      },
    };
  };

  const lateInitialURLContext = createDelayedInitialURLAdapter();
  const historyWithPreStartNavigation = createNativeHistory({
    initialPath: "/",
    adapter: lateInitialURLContext.adapter,
  });

  const startPromiseBeforeManualNavigation = historyWithPreStartNavigation.start();
  historyWithPreStartNavigation.push("/login");
  lateInitialURLContext.resolveInitialURL("voltra://host/");
  await startPromiseBeforeManualNavigation;

  const afterLateInitialURLWithNavigation = {
    fullPath: `${historyWithPreStartNavigation.location.path}${historyWithPreStartNavigation.location.search ?? ""}${historyWithPreStartNavigation.location.hash ?? ""}`,
    length: historyWithPreStartNavigation.length,
    index: historyWithPreStartNavigation.index,
  };

  historyWithPreStartNavigation.stop();

  const noNavigationContext = createDelayedInitialURLAdapter();
  const historyWithoutPreStartNavigation = createNativeHistory({
    initialPath: "/fallback",
    adapter: noNavigationContext.adapter,
  });

  const startPromiseWithoutManualNavigation = historyWithoutPreStartNavigation.start();
  noNavigationContext.resolveInitialURL("voltra://host/deep/link?tab=1");
  await startPromiseWithoutManualNavigation;

  const afterLateInitialURLWithoutNavigation = {
    fullPath: `${historyWithoutPreStartNavigation.location.path}${historyWithoutPreStartNavigation.location.search ?? ""}${historyWithoutPreStartNavigation.location.hash ?? ""}`,
    length: historyWithoutPreStartNavigation.length,
    index: historyWithoutPreStartNavigation.index,
  };

  historyWithoutPreStartNavigation.stop();

  return {
    afterLateInitialURLWithNavigation,
    afterLateInitialURLWithoutNavigation,
  };
};

export const runNativeHistoryPlatformBackOwnershipScenario = async () => {
  const backEvents: string[] = [];
  let listener: (() => boolean) | undefined;
  let removeCalls = 0;
  const backHandler: NativeBackHandlerLike = {
    addEventListener: (_eventName, nextListener) => {
      backEvents.push("subscribed");
      listener = nextListener;
      return {
        remove: () => {
          if (listener === nextListener) {
            listener = undefined;
          }
          removeCalls += 1;
          backEvents.push("removed");
        },
      };
    },
  };
  const history = createNativeHistory({
    initialPath: "/home",
    backHandler,
  });

  await history.start();
  history.push("/details");
  const firstBackConsumed = listener?.() ?? false;
  const secondBackConsumed = listener?.() ?? false;
  const pathAfterBacks = history.location.path;
  history.stop();

  return {
    backEvents,
    firstBackConsumed,
    secondBackConsumed,
    pathAfterBacks,
    removeCalls,
    listenerActiveAfterStop: typeof listener === "function",
  };
};
