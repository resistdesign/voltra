/**
 * @packageDocumentation
 *
 * Render-agnostic routing helpers with nested Route contexts.
 * Supply a RouteAdapter via RouteProvider or use root Route provider mode.
 */
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getPathArray,
  getParamsAndTestPath,
  getPathString,
  PATH_DELIMITER,
  mergeStringPaths,
  resolveRouteAdapterPath,
} from "../../common/Routing";
import {
  createUniversalAdapter,
  type UniversalRouteIngress,
} from "./UniversalRouteAdapter";

/**
 * Platform adapter that supplies the current path and change notifications.
 */
export type RouteAdapter = {
  /** Read the current path. */
  getPath: () => string;
  /** Subscribe to path changes. */
  subscribe: (listener: (path: string) => void) => () => void;
  /**
   * Optional navigation helper for adapters that can push state.
   *
   * `push`/`replace` paths are normalized through shared routing utils:
   * absolute (`/x`), relative (`x`, `./x`, `../x`), and empty (`""` => `/`).
   */
  push?: (path: string, title?: string) => void;
  /** Optional navigation helper for adapters that can replace state. */
  replace?: (path: string, title?: string) => void;
  /** Optional navigation helper for adapters that can go backward. */
  back?: () => void;
  /** Optional capability check for backward navigation. */
  canGoBack?: () => boolean;
};

/**
 * Optional runtime integration for root Route provider mode.
 *
 * Use this to layer platform-specific side effects (for example, native
 * hardware back wiring) without coupling core app routing to a platform API.
 */
export type RouteRuntimeIntegration = {
  /**
   * Start integration against the active adapter.
   *
   * Return a cleanup function when teardown is required.
   */
  setup: (adapter: RouteAdapter) => void | (() => void);
};

/**
 * Supported query value types for route serialization.
 */
export type RouteQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>;

/**
 * Query string map for route serialization.
 */
export type RouteQuery = Record<string, RouteQueryValue>;

/**
 * Route path matcher config.
 */
export type RoutePathConfig = {
  /** Path pattern, using `:` for params. */
  path: string;
  /** Optional exact-match override for this path entry. */
  exact?: boolean;
};

/**
 * Create a manual adapter for non-DOM runtimes (e.g., React Native).
 *
 * Call `updatePath` when navigation changes.
 */
export const createManualRouteAdapter = (initialPath: string = "/") => {
  let currentPath = initialPath;
  const listeners = new Set<(path: string) => void>();

  const updatePath = (nextPath: string) => {
    currentPath = nextPath;
    listeners.forEach((listener) => listener(nextPath));
  };

  const adapter: RouteAdapter = {
    getPath: () => currentPath,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    push: (path: string) =>
      updatePath(resolveRouteAdapterPath(currentPath, path)),
    replace: (path: string) =>
      updatePath(resolveRouteAdapterPath(currentPath, path)),
  };

  return {
    adapter,
    updatePath,
  };
};

const isDevelopmentMode = (): boolean => {
  const env = (globalThis as any)?.process?.env?.NODE_ENV;
  return env !== "production";
};

/**
 * Build a query string from a query object.
 *
 * @param query - Query string map.
 * @returns Encoded query string without the leading `?`.
 */
export const buildQueryString = (query: RouteQuery = {}): string => {
  const parts: string[] = [];

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined) {
      continue;
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const value of values) {
      if (value === undefined) {
        continue;
      }

      const encodedKey = encodeURIComponent(key);
      const encodedValue =
        value === null ? "" : encodeURIComponent(String(value));
      parts.push(`${encodedKey}=${encodedValue}`);
    }
  }

  return parts.join("&");
};

/**
 * Build a path string from segments and optional query params.
 *
 * @param segments - Ordered route segments.
 * @param query - Optional query parameters.
 * @returns Path string with optional query string.
 */
export const buildRoutePath = (
  segments: Array<string | number>,
  query?: RouteQuery,
): string => {
  const normalizedSegments = segments.map((segment) => String(segment));
  const basePath = "/" + getPathString(normalizedSegments, "/", true, false, true);
  const queryString = query ? buildQueryString(query) : "";

  return queryString ? `${basePath}?${queryString}` : basePath;
};

const getReadableRoutePath = (path: string): string =>
  getPathString(
    getPathArray(path, PATH_DELIMITER, true, true, true, false),
    PATH_DELIMITER,
    true,
    false,
    false,
  );

/**
 * Access values for the current `Route`.
 *
 * `parentPath` is the consumer-facing route pattern for the currently matched
 * parent route chain, expressed as plain slash-delimited segments such as
 * `app/books/:id`.
 *
 * `parentPathInternal` carries the same logical route pattern in the
 * JSON-serialized segment format used by the shared routing internals. Most
 * consumers should prefer `parentPath`.
 */
export type RouteContextType = {
  /**
   * Current window pathname (top-level) or inherited path (nested).
   */
  currentWindowPath: string;
  /**
   * Consumer-facing parent route pattern for this route level.
   *
   * Example: `app/books/:id`
   */
  parentPath: string;
  /**
   * Internal parent route pattern used by routing utilities and matcher logic.
   *
   * Example: `"app"/"books"/":id"`
   */
  parentPathInternal: string;
  /**
   * Aggregated route params from parent and current routes.
   */
  params: Record<string, any>;
  /**
   * Whether this route is the top-level router.
   */
  isTopLevel: boolean;
  /**
   * Absolute matched path used as the base for relative navigation at this
   * route level.
   */
  adapterBasePath: string;
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
  parentPathInternal: "",
  params: {},
  isTopLevel: true,
  adapterBasePath: "/",
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
 * Use `parentPath` for app-facing route logic. `parentPathInternal` is exposed
 * so advanced integrations can align with the internal routing helpers when
 * needed.
 *
 * @returns The current route context.
 */
export const useRouteContext = () => useContext(RouteContext);

/**
 * Wrap a RouteAdapter so `push` and `replace` resolve relative paths.
 *
 * This preserves existing adapter behavior for subscriptions/back navigation,
 * while normalizing path syntax consistently across web/native/app wrappers.
 *
 * @param adapter - RouteAdapter to normalize.
 * @returns Adapter with relative-aware `push` and `replace`.
 */
export const wrapRouteAdapterWithPathResolver = (
  adapter: RouteAdapter,
  getBasePath: () => string = () => adapter.getPath(),
): RouteAdapter => {
  if (!adapter.push && !adapter.replace) {
    return adapter;
  }

  const wrappedAdapter: RouteAdapter = {
    ...adapter,
    push: adapter.push
      ? (path: string, title?: string) => {
          adapter.push?.(resolveRouteAdapterPath(getBasePath(), path), title);
        }
      : undefined,
    replace: adapter.replace
      ? (path: string, title?: string) => {
          adapter.replace?.(resolveRouteAdapterPath(getBasePath(), path), title);
        }
      : undefined,
  };

  return wrappedAdapter;
};

const getAdapterBasePath = (currentPath: string): string => {
  const normalizedPath = String(currentPath ?? "").trim();
  if (normalizedPath === "") {
    return "/";
  }

  const [pathOnly] = normalizedPath.split(/[?#]/, 1);
  return pathOnly || "/";
};

const getMatchedRouteBasePath = (
  currentPath: string,
  matchedRoutePath: string,
): string => {
  const currentPathSegments = getPathArray(
    getAdapterBasePath(currentPath),
    PATH_DELIMITER,
    true,
    true,
    false,
    false,
  ) as string[];
  const matchedRouteSegments = getPathArray(matchedRoutePath) as string[];
  const resolvedSegments = currentPathSegments.slice(0, matchedRouteSegments.length);

  return resolvedSegments.length > 0
    ? `/${resolvedSegments.join(PATH_DELIMITER)}`
    : "/";
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

const useBrowserLinkInterceptor = (adapter: RouteAdapter | undefined) => {
  useEffect(() => {
    const WINDOW = getWindow();

    if (!WINDOW || !adapter?.push) {
      return undefined;
    }

    const handleAnchorClick = (event: MouseEvent) => {
      let target: Node | ParentNode | null = event.target as Node;

      while (target && (target as HTMLElement).nodeName !== "A") {
        target = target.parentNode;
      }

      if (!target || (target as HTMLElement).nodeName !== "A") {
        return;
      }

      const anchor = target as HTMLAnchorElement;
      const href = anchor.getAttribute("href");
      const title = anchor.getAttribute("title") ?? "";

      if (!href) {
        return;
      }

      try {
        new URL(href);
        return;
      } catch (error) {
        const nextPath = resolveRouteAdapterPath(
          WINDOW.location?.pathname ?? "",
          href,
        );
        event.preventDefault();
        adapter.push?.(nextPath, title);
      }
    };

    WINDOW.document?.addEventListener("click", handleAnchorClick);

    return () => {
      WINDOW.document?.removeEventListener("click", handleAnchorClick);
    };
  }, [adapter]);
};

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
  const normalizedAdapter = useMemo(
    () => wrapRouteAdapterWithPathResolver(adapter),
    [adapter],
  );
  const [currentPath, setCurrentPath] = useState<string>(
    initialPath ?? normalizedAdapter.getPath(),
  );
  const adapterBasePath = useMemo(
    () => getAdapterBasePath(currentPath),
    [currentPath],
  );

  useEffect(() => {
    return normalizedAdapter.subscribe((nextPath) => {
      setCurrentPath(nextPath);
    });
  }, [normalizedAdapter]);

  const contextValue = useMemo(
    () => ({
      currentWindowPath: currentPath,
      parentPath: "",
      parentPathInternal: "",
      params: {},
      isTopLevel: true,
      adapterBasePath,
      adapter: normalizedAdapter,
    }),
    [currentPath, adapterBasePath, normalizedAdapter],
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
   * Route path pattern(s), using `:` for params.
   */
  path?: string | (string | RoutePathConfig)[];
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
  /**
   * Optional initial path override for root provider mode only.
   */
  initialPath?: string;
  /**
   * Optional adapter override for root provider mode only.
   */
  adapter?: RouteAdapter;
  /**
   * Optional external URL ingress for root provider mode only.
   */
  ingress?: UniversalRouteIngress;
  /**
   * Optional runtime integration hook for root provider mode only.
   */
  runtimeIntegration?: RouteRuntimeIntegration;
};

/**
 * Organize nested routes with parameters.
 *
 * @typeParam ParamsType - Param shape for this route.
 * @param props - Route props including path, params handler, and children.
 */
const RouteMatcher = <ParamsType extends Record<string, any>>({
  /**
   * Use `:` as the first character to denote a parameter in the path.
   */
  path,
  onParamsChange,
  exact = false,
  children,
}: PropsWithChildren<
  Omit<RouteProps<ParamsType>, "path" | "initialPath" | "adapter"> & {
    runtimeIntegration?: never;
    path: string | (string | RoutePathConfig)[];
  }
>) => {
  const {
    currentWindowPath = "",
    parentPath = "",
    parentPathInternal = "",
    params: parentParams = {},
    adapterBasePath: inheritedAdapterBasePath = "/",
    adapter,
  } = useRouteContext();

  const targetCurrentPath = useMemo(
    () => currentWindowPath,
    [currentWindowPath],
  );
  const normalizedPaths = useMemo<RoutePathConfig[]>(() => {
    const routePaths = Array.isArray(path) ? path : [path];

    return routePaths.map((routePath) =>
      typeof routePath === "string"
        ? {
            path: routePath,
            exact,
          }
        : routePath,
    );
  }, [path, exact]);
  const matchedRoute = useMemo(
    () => {
      for (const routePathConfig of normalizedPaths) {
        const fullPath = mergeStringPaths(
          parentPathInternal,
          routePathConfig.path,
        );
        const newParams = getParamsAndTestPath(
          targetCurrentPath,
          fullPath,
          routePathConfig.exact,
        );

        if (newParams) {
          return {
            fullPath,
            newParams,
          };
        }
      }

      return null;
    },
    [targetCurrentPath, parentPathInternal, normalizedPaths],
  );
  const params = useMemo(
    () => ({
      ...parentParams,
      ...(matchedRoute?.newParams ? matchedRoute.newParams : {}),
    }),
    [parentParams, matchedRoute],
  );
  const matchedAdapterBasePath = useMemo(
    () =>
      matchedRoute
        ? getMatchedRouteBasePath(targetCurrentPath, matchedRoute.fullPath)
        : inheritedAdapterBasePath,
    [targetCurrentPath, matchedRoute, inheritedAdapterBasePath],
  );
  const scopedAdapter = useMemo(
    () =>
      adapter
        ? wrapRouteAdapterWithPathResolver(adapter, () => matchedAdapterBasePath)
        : adapter,
    [adapter, matchedAdapterBasePath],
  );
  const newRouteContext = useMemo(
    () => ({
      currentWindowPath: targetCurrentPath,
      parentPath: getReadableRoutePath(matchedRoute?.fullPath ?? parentPathInternal),
      parentPathInternal: matchedRoute?.fullPath ?? parentPathInternal,
      params,
      isTopLevel: false,
      adapterBasePath: matchedAdapterBasePath,
      adapter: scopedAdapter,
    }),
    [
      targetCurrentPath,
      matchedRoute,
      parentPathInternal,
      params,
      matchedAdapterBasePath,
      scopedAdapter,
    ],
  );

  useEffect(() => {
    if (onParamsChange) {
      onParamsChange(params as ParamsType);
    }
  }, [params, onParamsChange]);

  return matchedRoute?.newParams ? (
    <RouteContextProvider value={newRouteContext}>
      {children}
    </RouteContextProvider>
  ) : null;
};

const RouteRootProvider = ({
  children,
  adapter,
  initialPath,
  ingress,
  runtimeIntegration,
}: PropsWithChildren<{
  adapter?: RouteAdapter;
  initialPath?: string;
  ingress?: UniversalRouteIngress;
  runtimeIntegration?: RouteRuntimeIntegration;
}>) => {
  const routeContext = useRouteContext();
  const autoAdapterRef = useRef<RouteAdapter | null>(null);

  if (typeof routeContext.adapter !== "undefined" && isDevelopmentMode()) {
    throw new Error(
      "Route provider mode is root-only. Nested Route requires a path.",
    );
  }

  if (!autoAdapterRef.current) {
    autoAdapterRef.current =
      adapter ?? createUniversalAdapter({ initialPath, ingress });
  }
  useBrowserLinkInterceptor(autoAdapterRef.current);
  useEffect(() => {
    if (!runtimeIntegration || !autoAdapterRef.current) {
      return undefined;
    }

    return runtimeIntegration.setup(autoAdapterRef.current);
  }, [runtimeIntegration]);

  return (
    <RouteProvider adapter={autoAdapterRef.current} initialPath={initialPath}>
      {children}
    </RouteProvider>
  );
};

export const Route = <ParamsType extends Record<string, any>>(
  props: PropsWithChildren<RouteProps<ParamsType>>,
) => {
  const hasMatcherProps =
    typeof props.path !== "undefined" ||
    typeof props.exact !== "undefined" ||
    typeof props.onParamsChange !== "undefined";
  const hasProviderProps =
    typeof props.initialPath !== "undefined" ||
    typeof props.adapter !== "undefined" ||
    typeof props.ingress !== "undefined" ||
    typeof props.runtimeIntegration !== "undefined";

  if (hasMatcherProps) {
    if (hasProviderProps && isDevelopmentMode()) {
      throw new Error(
        "Route matcher mode does not support provider props. Remove initialPath/adapter/ingress/runtimeIntegration or use a root Route without path.",
      );
    }

    return (
      <RouteMatcher
        path={props.path ?? ""}
        onParamsChange={props.onParamsChange}
        exact={props.exact}
      >
        {props.children}
      </RouteMatcher>
    );
  }

  if (typeof props.path === "undefined") {

    return (
      <RouteRootProvider
        adapter={props.adapter}
        initialPath={props.initialPath}
        ingress={props.ingress}
        runtimeIntegration={props.runtimeIntegration}
      >
        {props.children}
      </RouteRootProvider>
    );
  }

  return null;
};
