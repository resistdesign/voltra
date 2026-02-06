/**
 * @packageDocumentation
 *
 * Bridge helpers between HistoryController and RouteAdapter.
 */
import type { HistoryController } from "./History";
import type { RouteAdapter } from "./Route";

/**
 * Create a RouteAdapter from a shared history controller.
 *
 * Route matching is path-based, so this adapter surfaces `location.path`
 * (query/hash are intentionally omitted from Route context matching).
 *
 * Adapter navigation methods call history with `replaceSearch: true` so a
 * path-only navigation does not accidentally retain a previous query string.
 *
 * Example:
 * ```ts
 * const history = createMemoryHistory("/app/books/42?tab=summary");
 * const adapter = createRouteAdapterFromHistory(history);
 * adapter.push?.("/app/books/99");
 * // history.location.path === "/app/books/99"
 * // history.location.search === undefined
 * ```
 */
export const createRouteAdapterFromHistory = (
  history: HistoryController,
): RouteAdapter => {
  return {
    getPath: () => history.location.path,
    subscribe: (listener) => {
      return history.listen((location) => {
        listener(location.path);
      });
    },
    push: (path: string) => {
      history.push(path, { replaceSearch: true });
    },
    replace: (path: string) => {
      history.replace(path, { replaceSearch: true });
    },
  };
};
