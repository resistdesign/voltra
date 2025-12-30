/**
 * @packageDocumentation
 *
 * Lightweight client-side routing helpers with nested Route contexts.
 * Uses the History API and intercepts anchor clicks for SPA navigation.
 */
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getParamsAndTestPath,
  mergeStringPaths,
  resolvePath,
} from "../../common/Routing";

(function (history) {
  const pushState = history.pushState;

  history.pushState = function (state, ...remainingArguments) {
    // @ts-ignore
    if (typeof history.onpushstate == "function") {
      // @ts-ignore
      history.onpushstate({ state: state });
    }

    // @ts-ignore
    const result = pushState.apply(history, [state, ...remainingArguments]);

    // Dispatch a custom event 'statechanged'
    window.dispatchEvent(new CustomEvent("statechanged", { detail: state }));

    return result;
  };
})(window.history);

const CURRENT_PATH: string = window.location.pathname;

/**
 * Access values for the current Route.
 * */
export type RouteContextType = {
  /**
   * Current window pathname (top-level) or inherited path (nested).
   * */
  currentWindowPath: string;
  /**
   * The parent path for this route level.
   * */
  parentPath: string;
  /**
   * Aggregated route params from parent and current routes.
   * */
  params: Record<string, any>;
  /**
   * Whether this route is the top-level router.
   * */
  isTopLevel: boolean;
};

/**
 * React context for route state and parameters.
 */
export const RouteContext = createContext<RouteContextType>({
  currentWindowPath: CURRENT_PATH,
  parentPath: "",
  params: {},
  isTopLevel: true,
});

export const {
  /**
   * @ignore
   * */
  Provider: RouteContextProvider,
  /**
   * @ignore
   * */
  Consumer: RouteContextConsumer,
} = RouteContext;

/**
 * Access Route path and parameter information.
 *
 * @returns The current route context.
 * */
export const useRouteContext = () => useContext(RouteContext);

/**
 * Configure the Route.
 * */
export type RouteProps<ParamsType extends Record<string, any>> = {
  /**
   * Route path pattern, using `:` for params.
   * */
  path?: string;
  /**
   * Callback when params update for this route.
   *
   * @param params - Resolved params for this route.
   * */
  onParamsChange?: (params: ParamsType) => void;
  /**
   * Require an exact match for the route path.
   * */
  exact?: boolean;
};

/**
 * Organize nested routes with parameters and integrate with the browser history.
 *
 * @typeParam ParamsType - Param shape for this route.
 * @param props - Route props including path, params handler, and children.
 * */
export const Route = <ParamsType extends Record<string, any>>({
  /**
   * Use `:` as the first character to denote a parameter in the path.
   * */
  path = "",
  onParamsChange,
  exact = false,
  children,
}: PropsWithChildren<RouteProps<ParamsType>>) => {
  const [currentPath = "", setCurrentPath] = useState<string>(CURRENT_PATH);
  const {
    currentWindowPath = "",
    parentPath = "",
    params: parentParams = {},
    isTopLevel,
  } = useRouteContext();
  const targetCurrentPath = useMemo(
    () => (isTopLevel ? currentPath : currentWindowPath),
    [isTopLevel, currentPath, currentWindowPath],
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
    }),
    [targetCurrentPath, fullPath, params],
  );

  useEffect(() => {
    if (onParamsChange) {
      onParamsChange(params as ParamsType);
    }
  }, [params, onParamsChange]);

  useEffect(() => {
    if (isTopLevel) {
      const handleAnchorClick = (event: MouseEvent) => {
        let target: Node | ParentNode | null = event.target as Node;

        while (target && target.nodeName !== "A") {
          target = target.parentNode;
        }

        if (target && target.nodeName === "A") {
          const aTarget: HTMLAnchorElement = target as HTMLAnchorElement;
          const href = aTarget.getAttribute("href");
          const title = aTarget.getAttribute("title") ?? "";

          try {
            new URL(href ? href : "");
            // Full URL
          } catch (error) {
            // Partial URL
            const newPath = resolvePath(
              window.location.pathname,
              href ? href : "",
            );

            event.preventDefault();
            history.pushState({}, title, newPath);
            setCurrentPath(newPath);
          }
        }
      };
      const handlePopOrReplaceState = () => {
        setCurrentPath(window.location.pathname);
      };

      window.document.addEventListener("click", handleAnchorClick);
      window.addEventListener("popstate", handlePopOrReplaceState);
      window.addEventListener("statechanged", handlePopOrReplaceState);

      return () => {
        window.document.removeEventListener("click", handleAnchorClick);
        window.removeEventListener("popstate", handlePopOrReplaceState);
        window.removeEventListener("statechanged", handlePopOrReplaceState);
      };
    }
  }, [isTopLevel]);

  return newParams ? (
    <RouteContextProvider value={newRouteContext}>
      {children}
    </RouteContextProvider>
  ) : null;
};
