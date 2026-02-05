/**
 * @packageDocumentation
 *
 * Native routing helpers that adapt common navigation state to RouteAdapter.
 */
import type { RouteAdapter } from "../../app/utils/Route";

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
