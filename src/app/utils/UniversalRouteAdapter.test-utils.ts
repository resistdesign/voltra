import {
  createUniversalAdapter,
} from "./UniversalRouteAdapter";
import type { RouteAdapter } from "./Route";

type WindowListenerMap = Record<string, (event: any) => void>;

const buildWindowMock = (pathname: string) => {
  const listeners: WindowListenerMap = {};

  const windowMock = {
    location: { pathname },
    history: {
      pushState: (_state: any, _title?: string, url?: string) => {
        if (typeof url === "string") {
          windowMock.location.pathname = url;
        }
      },
      replaceState: (_state: any, _title?: string, url?: string) => {
        if (typeof url === "string") {
          windowMock.location.pathname = url;
        }
      },
    },
    addEventListener: (event: string, handler: (ev: any) => void) => {
      listeners[event] = handler;
    },
    removeEventListener: (event: string) => {
      delete listeners[event];
    },
    dispatchEvent: (event: { type: string }) => {
      listeners[event.type]?.(event);
    },
  };

  return windowMock;
};

const trackLatestPath = (adapter: RouteAdapter) => {
  let latestPath = adapter.getPath();
  const unsubscribe = adapter.subscribe((path) => {
    latestPath = path;
  });

  return {
    getLatestPath: () => latestPath,
    unsubscribe,
  };
};

export const runUniversalAdapterWebScenario = () => {
  const originalWindow = (globalThis as any).window;
  const windowMock = buildWindowMock("/app/start");
  (globalThis as any).window = windowMock;

  const adapter = createUniversalAdapter();
  const pathTracker = trackLatestPath(adapter);
  const initialPathFromWindow = adapter.getPath() === "/app/start";

  adapter.push?.("/app/next");
  const pushUpdatesPath = pathTracker.getLatestPath() === "/app/next";

  adapter.replace?.("/app/final");
  const replaceUpdatesPath = pathTracker.getLatestPath() === "/app/final";

  windowMock.location.pathname = "/app/back";
  windowMock.dispatchEvent({ type: "popstate" });
  const popstateUpdatesPath = pathTracker.getLatestPath() === "/app/back";

  pathTracker.unsubscribe();
  (globalThis as any).window = originalWindow;

  return {
    initialPathFromWindow,
    pushUpdatesPath,
    replaceUpdatesPath,
    popstateUpdatesPath,
  };
};

export const runUniversalAdapterNativeScenario = () => {
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = undefined;

  const adapter = createUniversalAdapter({
    strategy: "native",
    initialPath: "/native/home",
  });
  const pathTracker = trackLatestPath(adapter);

  const initialPathFromMemory = adapter.getPath() === "/native/home";

  adapter.push?.("/native/a");
  const pushUpdatesPath = pathTracker.getLatestPath() === "/native/a";

  adapter.replace?.("/native/b");
  const replaceUpdatesPath = pathTracker.getLatestPath() === "/native/b";

  pathTracker.unsubscribe();
  (globalThis as any).window = originalWindow;

  return {
    initialPathFromMemory,
    pushUpdatesPath,
    replaceUpdatesPath,
  };
};

const flush = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

export const runUniversalAdapterIngressPrecedenceScenario = async () => {
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = undefined;

  const initialFromURLAdapter = createUniversalAdapter({
    strategy: "native",
    initialPath: "/fallback",
    ingress: {
      getInitialURL: async () => "/from-url",
    },
  });
  const initialFromURLTracker = trackLatestPath(initialFromURLAdapter);
  await flush();
  const initialURLWins = initialFromURLTracker.getLatestPath() === "/from-url";
  initialFromURLTracker.unsubscribe();

  const initialPathAdapter = createUniversalAdapter({
    strategy: "native",
    initialPath: "/from-initial-path",
    ingress: {
      getInitialURL: async () => null,
    },
  });
  const initialPathTracker = trackLatestPath(initialPathAdapter);
  await flush();
  const fallbackToInitialPath =
    initialPathTracker.getLatestPath() === "/from-initial-path";
  initialPathTracker.unsubscribe();

  const defaultAdapter = createUniversalAdapter({
    strategy: "native",
    ingress: {
      getInitialURL: async () => null,
    },
  });
  const defaultTracker = trackLatestPath(defaultAdapter);
  await flush();
  const fallbackToSlash = defaultTracker.getLatestPath() === "/";
  defaultTracker.unsubscribe();

  let ingressListener: ((url: string) => void) | undefined;
  const noopAdapter = createUniversalAdapter({
    strategy: "native",
    initialPath: "/same",
    ingress: {
      getInitialURL: async () => "/same",
      subscribe: (listener) => {
        ingressListener = listener;
        return () => {
          ingressListener = undefined;
        };
      },
    },
  });

  let notifications = 0;
  const stopNoopTracking = noopAdapter.subscribe(() => {
    notifications += 1;
  });
  await flush();
  noopAdapter.push?.("/same");
  noopAdapter.replace?.("/same");
  ingressListener?.("/same");
  await flush();
  const noOpOnIdenticalPath = notifications === 0;
  stopNoopTracking();

  (globalThis as any).window = originalWindow;

  return {
    initialURLWins,
    fallbackToInitialPath,
    fallbackToSlash,
    noOpOnIdenticalPath,
  };
};
