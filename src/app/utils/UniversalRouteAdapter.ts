/**
 * @packageDocumentation
 *
 * Unified route-adapter factory for web and non-DOM runtimes.
 */
import {
  buildHistoryPath,
  createMemoryHistory,
  parseHistoryPath,
} from "./History";
import { createRouteAdapterFromHistory } from "./RouteHistory";
import type { RouteAdapter } from "./Route";

/**
 * Runtime strategy for universal route adapters.
 */
export type UniversalRouteStrategy = "auto" | "web" | "native";

/**
 * Options for {@link createUniversalAdapter}.
 */
export type CreateUniversalAdapterOptions = {
  /**
   * Runtime strategy selection.
   *
   * - `"auto"`: use web when DOM + History API exist, else native.
   * - `"web"`: force browser history.
   * - `"native"`: force in-memory history.
   *
   * Default: `"auto"`.
   */
  strategy?: UniversalRouteStrategy;
  /**
   * Initial path used by native strategy memory history.
   *
   * Default: `"/"`.
   */
  initialPath?: string;
  /**
   * Optional ingress hook for native strategy.
   *
   * Use this to bridge deep-link systems into the adapter.
   */
  ingress?: UniversalRouteIngress;
};

/**
 * Ingress hook for applying external URLs/paths to native strategy.
 */
export type UniversalRouteIngress = {
  /**
   * Optional initial URL/path provider.
   */
  getInitialURL?: () => Promise<string | null | undefined> | string | null | undefined;
  /**
   * Optional URL/path event subscription.
   */
  subscribe?: (listener: (url: string) => void) => () => void;
  /**
   * Incoming event application mode.
   *
   * Default: `"replace"`.
   */
  onIncomingURL?: "push" | "replace";
  /**
   * Optional mapper converting URL -> route path.
   *
   * Default maps using shared history path parsing.
   */
  mapURLToPath?: (url: string) => string;
};

const getWindow = (): (Window & typeof globalThis) | undefined => {
  if (typeof globalThis === "undefined") {
    return undefined;
  }

  if ("window" in (globalThis as any)) {
    return (globalThis as any).window as Window & typeof globalThis;
  }

  return undefined;
};

/**
 * Detect whether browser history is available at runtime.
 */
export const canUseBrowserHistory = (): boolean => {
  const WINDOW = getWindow();
  return Boolean(
    WINDOW &&
      WINDOW.location &&
      WINDOW.history &&
      typeof WINDOW.history.pushState === "function",
  );
};

/**
 * Create a browser RouteAdapter backed by the History API.
 */
export const createBrowserRouteAdapter = (): RouteAdapter => {
  const WINDOW = getWindow();
  const listeners = new Set<(path: string) => void>();

  const notify = () => {
    const path = WINDOW?.location?.pathname ?? "";
    listeners.forEach((listener) => listener(path));
  };

  const handleHistoryEvent = () => {
    notify();
  };

  return {
    getPath: () => WINDOW?.location?.pathname ?? "",
    subscribe: (listener) => {
      listeners.add(listener);

      if (WINDOW) {
        WINDOW.addEventListener("popstate", handleHistoryEvent);
        WINDOW.addEventListener("statechanged", handleHistoryEvent);
      }

      return () => {
        listeners.delete(listener);
        if (WINDOW) {
          WINDOW.removeEventListener("popstate", handleHistoryEvent);
          WINDOW.removeEventListener("statechanged", handleHistoryEvent);
        }
      };
    },
    push: (path: string, title: string = "") => {
      if (!WINDOW?.history) {
        return;
      }

      const targetPath = parseHistoryPath(path).path;
      if (targetPath === (WINDOW.location?.pathname ?? "")) {
        return;
      }

      WINDOW.history.pushState({}, title, path);
      notify();
    },
    replace: (path: string, title: string = "") => {
      if (!WINDOW?.history?.replaceState) {
        return;
      }

      const targetPath = parseHistoryPath(path).path;
      if (targetPath === (WINDOW.location?.pathname ?? "")) {
        return;
      }

      WINDOW.history.replaceState({}, title, path);
      notify();
    },
    back: () => WINDOW?.history?.back(),
    canGoBack: () => (WINDOW?.history?.length ?? 0) > 1,
  };
};

/**
 * Create an in-memory RouteAdapter for non-DOM runtimes.
 */
export const createNativeRouteAdapter = (
  initialPath: string = "/",
  ingress?: UniversalRouteIngress,
): RouteAdapter => {
  const mapURLToPath =
    ingress?.mapURLToPath ??
    ((url: string) => buildHistoryPath(parseHistoryPath(url)));
  const onIncomingURL = ingress?.onIncomingURL ?? "replace";
  const history = createMemoryHistory(initialPath);
  const adapter = createRouteAdapterFromHistory(history);
  let stopIngress: (() => void) | undefined;
  let ingressStarted = false;
  let subscribers = 0;

  const applyPath = (path: string, mode: "push" | "replace") => {
    const normalizedPath = parseHistoryPath(path).path;
    if (!normalizedPath || normalizedPath === history.location.path) {
      return;
    }

    if (mode === "push") {
      history.push(normalizedPath, { replaceSearch: true });
      return;
    }

    history.replace(normalizedPath, { replaceSearch: true });
  };

  const startIngress = async () => {
    if (ingressStarted || !ingress) {
      return;
    }

    ingressStarted = true;
    const startKey = history.location.key;
    const startIndex = history.index;

    if (ingress.subscribe) {
      stopIngress = ingress.subscribe((url) => {
        const nextPath = mapURLToPath(url);
        if (!nextPath) {
          return;
        }
        applyPath(nextPath, onIncomingURL);
      });
    }

    const initialURL = await ingress.getInitialURL?.();
    const userNavigated =
      history.location.key !== startKey || history.index !== startIndex;

    if (!userNavigated && initialURL) {
      const nextPath = mapURLToPath(initialURL);
      if (nextPath) {
        applyPath(nextPath, "replace");
      }
    }
  };

  return {
    ...adapter,
    push: (path: string, title?: string) => {
      if (parseHistoryPath(path).path === history.location.path) {
        return;
      }
      adapter.push?.(path, title);
    },
    replace: (path: string, title?: string) => {
      if (parseHistoryPath(path).path === history.location.path) {
        return;
      }
      adapter.replace?.(path, title);
    },
    subscribe: (listener) => {
      subscribers += 1;
      if (subscribers === 1) {
        void startIngress();
      }

      const unlisten = adapter.subscribe(listener);
      return () => {
        unlisten();
        subscribers = Math.max(0, subscribers - 1);
        if (subscribers === 0) {
          stopIngress?.();
          stopIngress = undefined;
          ingressStarted = false;
        }
      };
    },
    back: adapter.back,
    canGoBack: adapter.canGoBack,
  };
};

/**
 * Create a runtime-selected RouteAdapter for web/native environments.
 */
export const createUniversalAdapter = (
  options: CreateUniversalAdapterOptions = {},
): RouteAdapter => {
  const { strategy = "auto", initialPath = "/", ingress } = options;

  if (strategy === "web") {
    return createBrowserRouteAdapter();
  }

  if (strategy === "native") {
    return createNativeRouteAdapter(initialPath, ingress);
  }

  return canUseBrowserHistory()
    ? createBrowserRouteAdapter()
    : createNativeRouteAdapter(initialPath, ingress);
};
