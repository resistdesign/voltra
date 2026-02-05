/**
 * @packageDocumentation
 *
 * Render-agnostic routing helpers with nested Route contexts.
 * Supply a RouteAdapter via RouteProvider or a platform-specific wrapper.
 */
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getParamsAndTestPath, mergeStringPaths } from "../../common/Routing";

/**
 * Platform adapter that supplies the current path and change notifications.
 */
export type RouteAdapter = {
  /** Read the current path. */
  getPath: () => string;
  /** Subscribe to path changes. */
  subscribe: (listener: (path: string) => void) => () => void;
  /** Optional navigation helper for adapters that can push state. */
  push?: (path: string, title?: string) => void;
  /** Optional navigation helper for adapters that can replace state. */
  replace?: (path: string, title?: string) => void;
};

/**
 * Access values for the current Route.
 */
export type RouteContextType = {
  /**
   * Current window pathname (top-level) or inherited path (nested).
   */
  currentWindowPath: string;
  /**
   * The parent path for this route level.
   */
  parentPath: string;
  /**
   * Aggregated route params from parent and current routes.
   */
  params: Record<string, any>;
  /**
   * Whether this route is the top-level router.
   */
  isTopLevel: boolean;
  /**
   * Adapter driving route updates.
   */
  adapter?: RouteAdapter;
};

/**
 * React context for route state and parameters.
 */
export const RouteContext = createContext<RouteContextType>({
  currentWindowPath: "",
  parentPath: "",
  params: {},
  isTopLevel: true,
});

export const {
  /**
   * @ignore
   */
  Provider: RouteContextProvider,
  /**
   * @ignore
   */
  Consumer: RouteContextConsumer,
} = RouteContext;

/**
 * Access Route path and parameter information.
 *
 * @returns The current route context.
 */
export const useRouteContext = () => useContext(RouteContext);

/**
 * RouteProvider props.
 */
export type RouteProviderProps = PropsWithChildren<{
  /** Adapter that supplies path updates. */
  adapter: RouteAdapter;
  /** Optional initial path override. */
  initialPath?: string;
}>;

/**
 * Provide a RouteAdapter to the routing context.
 *
 * @param props - Provider props with adapter and children.
 */
export const RouteProvider = ({
  adapter,
  initialPath,
  children,
}: RouteProviderProps) => {
  const [currentPath, setCurrentPath] = useState<string>(
    initialPath ?? adapter.getPath(),
  );

  useEffect(() => {
    return adapter.subscribe((nextPath) => {
      setCurrentPath(nextPath);
    });
  }, [adapter]);

  const contextValue = useMemo(
    () => ({
      currentWindowPath: currentPath,
      parentPath: "",
      params: {},
      isTopLevel: true,
      adapter,
    }),
    [currentPath, adapter],
  );

  return (
    <RouteContextProvider value={contextValue}>
      {children}
    </RouteContextProvider>
  );
};

/**
 * Configure the Route.
 */
export type RouteProps<ParamsType extends Record<string, any>> = {
  /**
   * Route path pattern, using `:` for params.
   */
  path?: string;
  /**
   * Callback when params update for this route.
   *
   * @param params - Resolved params for this route.
   */
  onParamsChange?: (params: ParamsType) => void;
  /**
   * Require an exact match for the route path.
   */
  exact?: boolean;
};

/**
 * Organize nested routes with parameters.
 *
 * @typeParam ParamsType - Param shape for this route.
 * @param props - Route props including path, params handler, and children.
 */
export const Route = <ParamsType extends Record<string, any>>({
  /**
   * Use `:` as the first character to denote a parameter in the path.
   */
  path = "",
  onParamsChange,
  exact = false,
  children,
}: PropsWithChildren<RouteProps<ParamsType>>) => {
  const {
    currentWindowPath = "",
    parentPath = "",
    params: parentParams = {},
    isTopLevel,
    adapter,
  } = useRouteContext();

  const targetCurrentPath = useMemo(
    () => currentWindowPath,
    [currentWindowPath],
  );
  const fullPath = useMemo(
    () => mergeStringPaths(parentPath, path),
    [parentPath, path],
  );
  const newParams = useMemo(
    () => getParamsAndTestPath(targetCurrentPath, fullPath, exact),
    [targetCurrentPath, fullPath, exact],
  );
  const params = useMemo(
    () => ({
      ...parentParams,
      ...(newParams ? newParams : {}),
    }),
    [parentParams, newParams],
  );
  const newRouteContext = useMemo(
    () => ({
      currentWindowPath: targetCurrentPath,
      parentPath: fullPath,
      params,
      isTopLevel: false,
      adapter,
    }),
    [targetCurrentPath, fullPath, params, adapter],
  );

  useEffect(() => {
    if (onParamsChange) {
      onParamsChange(params as ParamsType);
    }
  }, [params, onParamsChange]);

  return newParams ? (
    <RouteContextProvider value={newRouteContext}>
      {children}
    </RouteContextProvider>
  ) : null;
};
