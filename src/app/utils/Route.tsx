/**
 * @packageDocumentation
 *
 * Render-agnostic routing helpers with nested Route contexts.
 * Supply a RouteAdapter via RouteProvider or use root Route provider mode.
 */
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getParamsAndTestPath,
  getPathString,
  mergeStringPaths,
  resolvePath,
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
  /** Optional navigation helper for adapters that can push state. */
  push?: (path: string, title?: string) => void;
  /** Optional navigation helper for adapters that can replace state. */
  replace?: (path: string, title?: string) => void;
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
    push: (path: string) => updatePath(path),
    replace: (path: string) => updatePath(path),
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
        const nextPath = resolvePath(WINDOW.location?.pathname ?? "", href);
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
    path: string;
  }
>) => {
  const {
    currentWindowPath = "",
    parentPath = "",
    params: parentParams = {},
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

const RouteRootProvider = ({
  children,
  adapter,
  initialPath,
  ingress,
}: PropsWithChildren<{
  adapter?: RouteAdapter;
  initialPath?: string;
  ingress?: UniversalRouteIngress;
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
    typeof props.ingress !== "undefined";

  if (hasMatcherProps) {
    if (hasProviderProps && isDevelopmentMode()) {
      throw new Error(
        "Route matcher mode does not support provider props. Remove initialPath/adapter/ingress or use a root Route without path.",
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
      >
        {props.children}
      </RouteRootProvider>
    );
  }

  return null;
};
