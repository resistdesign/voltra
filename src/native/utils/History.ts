/**
 * @packageDocumentation
 *
 * Native history helpers that provide the mobile equivalent of browser
 * location/history behavior for shared app Route matching.
 */
import type { HistoryController } from "../../app/utils/History";
import {
  buildHistoryPath,
  createHistoryBackHandler,
  createMemoryHistory,
  parseHistoryPath,
} from "../../app/utils/History";

/**
 * Adapter contract for React Native deep-link APIs.
 *
 * Intended for RN `Linking` wrappers so native URL opens behave like browser
 * navigations entering the shared Voltra history model.
 */
export type NativeLinkAdapter = {
  /**
   * Get the initial URL that opened the app.
   */
  getInitialURL: () => Promise<string | null>;
  /**
   * Subscribe to incoming URL events.
   */
  subscribe: (listener: (url: string) => void) => () => void;
};

/**
 * Mode for incoming URL handling.
 */
export type NativeIncomingURLMode = "push" | "replace";

/**
 * BackHandler-like contract for native platform back actions.
 */
export type NativeBackHandlerLike = {
  addEventListener: (
    eventName: "hardwareBackPress",
    listener: () => boolean,
  ) => { remove?: () => void } | void;
  removeEventListener?: (
    eventName: "hardwareBackPress",
    listener: () => boolean,
  ) => void;
};

/**
 * Native history controller with explicit lifecycle hooks.
 *
 * This is the native/mobile analogue to browser-backed history in web apps.
 */
export type NativeHistoryController = HistoryController & {
  /**
   * Start listening for incoming deep links.
   */
  start: () => Promise<void>;
  /**
   * Stop listening for incoming deep links.
   */
  stop: () => void;
};

/**
 * Create-native-history options.
 */
export type CreateNativeHistoryOptions = {
  /**
   * Deep-link adapter implementation.
   */
  adapter?: NativeLinkAdapter;
  /**
   * Initial fallback path when there is no incoming URL.
   *
   * Default: `"/"`.
   */
  initialPath?: string;
  /**
   * How to apply incoming URL events to history.
   *
   * Default: `"replace"`.
   */
  onIncomingURL?: NativeIncomingURLMode;
  /**
   * Mapper for converting a URL into a path string.
   *
   * Default: {@link mapNativeURLToPath}.
   */
  mapURLToPath?: (url: string) => string;
  /**
   * Optional native platform back handler wired into this history runtime.
   */
  backHandler?: NativeBackHandlerLike;
};

/**
 * Default native URL -> path mapping.
 *
 * Strips scheme and host, preserves path + query + hash so incoming native URLs
 * become the same route paths used on web.
 */
export const mapNativeURLToPath = (url: string): string =>
  buildHistoryPath(parseHistoryPath(url));

/**
 * Create a native history controller backed by in-memory history.
 *
 * This is the primary native routing primitive when the environment does not
 * provide browser history. It gives shared Route matching a stable path/history
 * source and applies incoming deep links as navigations in that same model.
 *
 * Lifecycle behavior:
 * - `start()` is idempotent.
 * - `stop()` is idempotent.
 * - `start()` applies `getInitialURL()` once per start cycle only if
 *   navigation state has not changed since startup began.
 * - This prevents late `getInitialURL()` resolution from overriding
 *   user navigation that happened during startup.
 *
 * Incoming URL behavior:
 * - `"replace"` updates current entry (default).
 * - `"push"` appends a new entry.
 *
 * Example:
 * ```ts
 * const history = createNativeHistory({
 *   adapter: linkingAdapter,
 *   onIncomingURL: "replace",
 * });
 * await history.start();
 * ```
 */
export const createNativeHistory = (
  options: CreateNativeHistoryOptions = {},
): NativeHistoryController => {
  const {
    adapter,
    initialPath = "/",
    onIncomingURL = "replace",
    mapURLToPath = mapNativeURLToPath,
    backHandler,
  } = options;

  const history = createMemoryHistory(initialPath);
  const historyBackHandler = createHistoryBackHandler(history);
  let unsubscribe: (() => void) | undefined;
  let stopBackHandler: (() => void) | undefined;
  let started = false;

  const applyIncomingURL = (url: string | null | undefined) => {
    if (!url) {
      return;
    }

    const targetPath = mapURLToPath(url);
    if (!targetPath) {
      return;
    }

    if (onIncomingURL === "push") {
      history.push(targetPath, { replaceSearch: true });
    } else {
      history.replace(targetPath, { replaceSearch: true });
    }
  };

  return {
    get location() {
      return history.location;
    },
    get length() {
      return history.length;
    },
    get index() {
      return history.index;
    },
    push: history.push,
    replace: history.replace,
    go: history.go,
    back: history.back,
    forward: history.forward,
    listen: history.listen,
    start: async () => {
      if (started) {
        return;
      }

      started = true;

      if (backHandler && !stopBackHandler) {
        const listener = () => historyBackHandler.handle();
        const subscription = backHandler.addEventListener(
          "hardwareBackPress",
          listener,
        );

        stopBackHandler = () => {
          if (typeof subscription?.remove === "function") {
            subscription.remove();
            return;
          }

          backHandler.removeEventListener?.("hardwareBackPress", listener);
        };
      }

      if (!adapter) {
        return;
      }

      const startKey = history.location.key;
      const startIndex = history.index;

      unsubscribe = adapter.subscribe((url) => {
        const targetPath = mapURLToPath(url);
        if (!targetPath) {
          return;
        }

        const userNavigated =
          history.location.key !== startKey || history.index !== startIndex;

        if (userNavigated && targetPath === initialPath) {
          return;
        }

        if (onIncomingURL === "push") {
          history.push(targetPath, { replaceSearch: true });
        } else {
          history.replace(targetPath, { replaceSearch: true });
        }
      });

      const initialURL = await adapter.getInitialURL();
      if (history.location.key === startKey && history.index === startIndex) {
        applyIncomingURL(initialURL);
      }
    },
    stop: () => {
      if (!started) {
        return;
      }

      unsubscribe?.();
      unsubscribe = undefined;
      stopBackHandler?.();
      stopBackHandler = undefined;
      started = false;
    },
  };
};

/**
 * @deprecated Use {@link createHistoryBackHandler} from `app/utils/History`.
 */
export const createNativeBackHandler = (history: HistoryController) =>
  createHistoryBackHandler(history);
