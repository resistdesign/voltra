/**
 * @packageDocumentation
 *
 * Native history helpers that adapt deep links into the shared history state machine.
 */
import type { HistoryController } from "../../app/utils/History";
import {
  buildHistoryPath,
  createMemoryHistory,
  parseHistoryPath,
} from "../../app/utils/History";

/**
 * Adapter contract for React Native deep-link APIs.
 *
 * Intended for RN `Linking` wrappers.
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
 * Native history controller with explicit lifecycle hooks.
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
};

/**
 * Default native URL -> path mapping.
 *
 * Strips scheme and host, preserves path + query + hash.
 */
export const mapNativeURLToPath = (url: string): string =>
  buildHistoryPath(parseHistoryPath(url));

/**
 * Create a native history controller backed by in-memory history.
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
  } = options;

  const history = createMemoryHistory(initialPath);
  let unsubscribe: (() => void) | undefined;
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

      if (!adapter) {
        return;
      }

      const startKey = history.location.key;
      const startIndex = history.index;
      unsubscribe = adapter.subscribe((url) => {
        applyIncomingURL(url);
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
      started = false;
    },
  };
};

/**
 * Create an Android back-handler helper for native history.
 *
 * Returns `true` only when history consumed the back action.
 *
 * Example:
 * ```ts
 * const handler = createNativeBackHandler(history);
 * const consumed = handler.handle();
 * ```
 */
export const createNativeBackHandler = (history: HistoryController) => {
  return {
    /**
     * @returns True when back navigation was handled by history.
     */
    handle: (): boolean => {
      if (history.index > 0) {
        history.back();
        return true;
      }
      return false;
    },
  };
};
