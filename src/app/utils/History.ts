/**
 * @packageDocumentation
 *
 * Platform-agnostic history state machine and path helpers.
 */

/**
 * A normalized location entry in history.
 */
export type HistoryLocation = {
  /**
   * Normalized pathname. Always starts with `/`.
   */
  path: string;
  /**
   * Optional query string (including leading `?`).
   */
  search?: string;
  /**
   * Optional hash fragment (including leading `#`).
   */
  hash?: string;
  /**
   * Optional app-defined state payload.
   */
  state?: unknown;
  /**
   * Stable entry key, unique per history entry.
   */
  key: string;
};

/**
 * An entry inside the history stack.
 */
export type HistoryEntry = {
  location: HistoryLocation;
};

/**
 * History listener callback.
 */
export type HistoryListener = (location: HistoryLocation) => void;

/**
 * Path parts extracted from a route string.
 */
export type HistoryPathParts = Pick<HistoryLocation, "path" | "search" | "hash">;

/**
 * Shared history controller interface.
 *
 * This is intentionally platform-agnostic. Web/native adapters can translate
 * platform events into calls on this interface.
 */
export type HistoryController = {
  /**
   * Current location.
   */
  location: HistoryLocation;
  /**
   * Number of entries in the history stack.
   */
  length: number;
  /**
   * Active entry index in the history stack.
   */
  index: number;

  /**
   * Push a new history entry.
   *
   * `replaceSearch` controls behavior when `path` does not include `?query`:
   * - `false`/unset: carry forward current `search`.
   * - `true`: clear current `search`.
   */
  push: (
    path: string,
    opts?: {
      state?: unknown;
      replaceSearch?: boolean;
    },
  ) => void;
  /**
   * Replace the current history entry.
   *
   * `replaceSearch` follows the same behavior as {@link push}.
   */
  replace: (
    path: string,
    opts?: {
      state?: unknown;
      replaceSearch?: boolean;
    },
  ) => void;
  /**
   * Move by delta within the history stack.
   */
  go: (delta: number) => void;
  /**
   * Move back one entry.
   */
  back: () => void;
  /**
   * Move forward one entry.
   */
  forward: () => void;
  /**
   * Subscribe to location changes.
   */
  listen: (listener: HistoryListener) => () => void;
};

const ensurePrefix = (value: string, prefix: string): string =>
  value ? (value.startsWith(prefix) ? value : `${prefix}${value}`) : "";

/**
 * Parse a path-like value into normalized path/search/hash parts.
 *
 * Supports full URLs and path-only strings.
 *
 * Examples:
 * ```ts
 * parseHistoryPath("voltra://host/books/42?tab=info#top")
 * // { path: "/books/42", search: "?tab=info", hash: "#top" }
 *
 * parseHistoryPath("books/42")
 * // { path: "/books/42" }
 * ```
 */
export const parseHistoryPath = (inputPath: string): HistoryPathParts => {
  const raw = String(inputPath ?? "").trim();

  if (!raw) {
    return { path: "/" };
  }

  try {
    const absoluteUrl = new URL(raw);
    return {
      path: absoluteUrl.pathname || "/",
      ...(absoluteUrl.search ? { search: absoluteUrl.search } : {}),
      ...(absoluteUrl.hash ? { hash: absoluteUrl.hash } : {}),
    };
  } catch (error) {
    let target = raw;
    let hash = "";
    let search = "";

    const hashIndex = target.indexOf("#");
    if (hashIndex >= 0) {
      hash = target.slice(hashIndex);
      target = target.slice(0, hashIndex);
    }

    const searchIndex = target.indexOf("?");
    if (searchIndex >= 0) {
      search = target.slice(searchIndex);
      target = target.slice(0, searchIndex);
    }

    const path = target ? (target.startsWith("/") ? target : `/${target}`) : "/";

    return {
      path,
      ...(search && search !== "?" ? { search } : {}),
      ...(hash && hash !== "#" ? { hash } : {}),
    };
  }
};

/**
 * Build a path string from normalized path/search/hash parts.
 *
 * Missing prefixes are normalized:
 * - `search: "q=1"` -> `?q=1`
 * - `hash: "section"` -> `#section`
 *
 * Example:
 * ```ts
 * buildHistoryPath({ path: "books/42", search: "tab=info" })
 * // "/books/42?tab=info"
 * ```
 */
export const buildHistoryPath = ({
  path,
  search,
  hash,
}: HistoryPathParts): string => {
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "/";
  const normalizedSearch = search ? ensurePrefix(search, "?") : "";
  const normalizedHash = hash ? ensurePrefix(hash, "#") : "";

  return `${normalizedPath}${normalizedSearch}${normalizedHash}`;
};

const getHistoryLocation = (
  inputPath: string,
  state: unknown,
  getNextKey: () => string,
  currentLocation?: HistoryLocation,
  replaceSearch: boolean = false,
): HistoryLocation => {
  const parsed = parseHistoryPath(inputPath);
  const nextSearch =
    typeof parsed.search === "undefined"
      ? replaceSearch
        ? undefined
        : currentLocation?.search
      : parsed.search;

  return {
    path: parsed.path,
    ...(typeof nextSearch !== "undefined" ? { search: nextSearch } : {}),
    ...(parsed.hash ? { hash: parsed.hash } : {}),
    ...(typeof state !== "undefined" ? { state } : {}),
    key: getNextKey(),
  };
};

/**
 * Create an in-memory history implementation.
 *
 * @param initialPath - Initial path used for the first entry.
 * @returns History controller backed by an in-memory stack.
 *
 * Behavior notes:
 * - `go(delta)` clamps to valid bounds `[0, length - 1]`.
 * - `push` after `back` drops forward entries.
 * - listeners are called only when active location changes.
 *
 * Example:
 * ```ts
 * const history = createMemoryHistory("/home?tab=all");
 * history.push("/details/42");
 * history.back();
 * ```
 */
export const createMemoryHistory = (initialPath: string = "/"): HistoryController => {
  let keyCounter = 0;
  const getNextKey = () => `h${keyCounter++}`;
  const listeners = new Set<HistoryListener>();
  const entries: HistoryEntry[] = [
    {
      location: getHistoryLocation(
        initialPath,
        undefined,
        getNextKey,
        undefined,
        true,
      ),
    },
  ];
  let currentIndex = 0;

  const getCurrentLocation = () => entries[currentIndex].location;
  const notify = () => {
    const location = getCurrentLocation();
    listeners.forEach((listener) => listener(location));
  };

  const push: HistoryController["push"] = (path, opts) => {
    const location = getHistoryLocation(
      path,
      opts?.state,
      getNextKey,
      getCurrentLocation(),
      opts?.replaceSearch === true,
    );

    if (currentIndex < entries.length - 1) {
      entries.splice(currentIndex + 1);
    }

    entries.push({ location });
    currentIndex = entries.length - 1;
    notify();
  };

  const replace: HistoryController["replace"] = (path, opts) => {
    const location = getHistoryLocation(
      path,
      opts?.state,
      getNextKey,
      getCurrentLocation(),
      opts?.replaceSearch === true,
    );
    entries[currentIndex] = { location };
    notify();
  };

  const go: HistoryController["go"] = (delta) => {
    if (!Number.isFinite(delta)) {
      return;
    }

    const targetIndex = Math.max(
      0,
      Math.min(entries.length - 1, currentIndex + Math.trunc(delta)),
    );

    if (targetIndex === currentIndex) {
      return;
    }

    currentIndex = targetIndex;
    notify();
  };

  return {
    get location() {
      return getCurrentLocation();
    },
    get length() {
      return entries.length;
    },
    get index() {
      return currentIndex;
    },
    push,
    replace,
    go,
    back: () => go(-1),
    forward: () => go(1),
    listen: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
