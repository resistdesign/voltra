/**
 * @packageDocumentation
 *
 * Native routing helpers that adapt common navigation state to RouteAdapter.
 */
import type { RouteAdapter, RouteQuery } from "../../app/utils/Route";
import { buildRoutePath } from "../../app/utils/Route";
import { getPathArray } from "../../common/Routing";

/**
 * Options to adapt a navigation state container into a RouteAdapter.
 */
export type NavigationStateAdapterOptions<TState> = {
  /** Return the current navigation state. */
  getState: () => TState;
  /** Subscribe to navigation state changes. */
  subscribe: (listener: () => void) => () => void;
  /** Convert navigation state into a path string. */
  toPath: (state: TState) => string;
  /** Optional navigation handler used for push-style transitions. */
  navigate?: (path: string) => void;
  /** Optional navigation handler used for replace-style transitions. */
  replace?: (path: string) => void;
};

/**
 * Route node in a navigation chain.
 */
export type NavigationRouteNode = {
  /** Route name as reported by the navigation library. */
  name: string;
  /** Optional route params used to populate path patterns. */
  params?: Record<string, any>;
};

/**
 * Mapping of route names to path patterns (e.g. "books/:id").
 */
export type NavigationRouteConfig = Record<string, string>;

/**
 * Create a RouteAdapter from a navigation state container (e.g., react-navigation).
 *
 * @param options - Adapter options for accessing and observing navigation state.
 * @returns RouteAdapter bound to the navigation state.
 */
export const createNavigationStateRouteAdapter = <TState>(
  options: NavigationStateAdapterOptions<TState>,
): RouteAdapter => {
  const getPath = () => options.toPath(options.getState());

  return {
    getPath,
    subscribe: (listener) =>
      options.subscribe(() => {
        listener(getPath());
      }),
    push: options.navigate ? (path: string) => options.navigate?.(path) : undefined,
    replace: options.replace ? (path: string) => options.replace?.(path) : undefined,
  };
};

const expandPattern = (pattern: string, params: Record<string, any> = {}) => {
  const segments = getPathArray(pattern, "/", true, true, false, false);

  return segments.map((segment) => {
    if (segment.startsWith(":")) {
      const key = segment.slice(1);
      if (!(key in params)) {
        throw new Error(`Missing param "${key}" for route pattern "${pattern}".`);
      }
      return params[key];
    }
    return segment;
  });
};

/**
 * Build a path from a navigation route chain and route config mapping.
 *
 * @param routeChain - Ordered list of routes from root to leaf.
 * @param config - Route name to path pattern mapping.
 * @param query - Optional query parameters appended to the path.
 * @returns Serialized path string.
 */
export const buildPathFromRouteChain = (
  routeChain: NavigationRouteNode[],
  config: NavigationRouteConfig,
  query?: RouteQuery,
): string => {
  const segments: Array<string | number> = [];

  routeChain.forEach((route) => {
    const pattern = config[route.name];
    if (!pattern) {
      throw new Error(`Missing route pattern for "${route.name}".`);
    }

    segments.push(...expandPattern(pattern, route.params));
  });

  return buildRoutePath(segments, query);
};
