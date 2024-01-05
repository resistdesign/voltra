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
} from "../../common/utils/Routing";

(function (history) {
  const pushState = history.pushState;

  history.pushState = function (state, title, url) {
    // @ts-ignore
    if (typeof history.onpushstate == "function") {
      // @ts-ignore
      history.onpushstate({ state: state });
    }

    // @ts-ignore
    const result = pushState.apply(history, arguments);

    // Dispatch a custom event 'statechanged'
    window.dispatchEvent(new CustomEvent("statechanged", { detail: state }));

    return result;
  };
})(window.history);

const CURRENT_PATH: string = window.location.pathname;

export type RouteContextType = {
  currentWindowPath: string;
  parentPath: string;
  params: Record<string, any>;
};

export const RouteContext = createContext<RouteContextType>({
  currentWindowPath: CURRENT_PATH,
  parentPath: "",
  params: {},
});
export const {
  Provider: RouteContextProvider,
  Consumer: RouteContextConsumer,
} = RouteContext;

export const useRouteContext = () => useContext(RouteContext);

export type RouteProps<ParamsType extends Record<string, any>> = {
  path?: string;
  onParamsChange?: (params: ParamsType) => void;
  exact?: boolean;
};

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
  } = useRouteContext();
  const isTopLevel = useMemo(() => !parentPath, [parentPath]);
  const fullPath = useMemo(
    () => mergeStringPaths(parentPath, path),
    [parentPath, path],
  );
  const newParams = useMemo(
    () =>
      getParamsAndTestPath(
        isTopLevel ? currentPath : currentWindowPath,
        fullPath,
        exact,
      ),
    [isTopLevel, currentPath, currentWindowPath, fullPath, exact],
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
      currentWindowPath: currentPath,
      parentPath: fullPath,
      params,
    }),
    [currentPath, fullPath, params],
  );

  useEffect(() => {
    if (onParamsChange) {
      onParamsChange(params as ParamsType);
    }
  }, [params, onParamsChange]);

  useEffect(() => {
    if (parentPath.length === 0) {
      const handleAnchorClick = (event: MouseEvent) => {
        let target: Node | ParentNode | null = event.target as Node;

        while (target && target.nodeName !== "A") {
          target = target.parentNode;
        }

        if (target && target.nodeName === "A") {
          const aTarget: HTMLAnchorElement = target as HTMLAnchorElement;
          const href = aTarget.getAttribute("href");

          event.preventDefault();
          history.pushState(
            {},
            "",
            resolvePath(window.location.pathname, href ? href : ""),
          );
          setCurrentPath(window.location.pathname);
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
  }, [parentPath]);

  return newParams ? (
    <RouteContextProvider value={newRouteContext}>
      {children}
    </RouteContextProvider>
  ) : null;
};
