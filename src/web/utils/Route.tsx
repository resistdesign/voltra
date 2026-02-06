/**
 * @packageDocumentation
 *
 * Web (DOM) routing helpers that wire the app-level Route to browser history.
 */
import React, { PropsWithChildren, useEffect, useMemo, useRef } from "react";
import { resolvePath } from "../../common/Routing";
import {
  Route as CoreRoute,
  type RouteAdapter,
  RouteProvider as CoreRouteProvider,
  type RouteProps,
  useRouteContext,
} from "../../app/utils/Route";

const getWindow = (): (Window & typeof globalThis) | undefined => {
  if (typeof globalThis === "undefined") {
    return undefined;
  }

  if ("window" in (globalThis as any)) {
    return (globalThis as any).window as Window & typeof globalThis;
  }

  return undefined;
};

/**
 * Create a browser RouteAdapter backed by the History API.
 */
export const createBrowserRouteAdapter = (): RouteAdapter => {
  const WINDOW = getWindow();
  const listeners = new Set<(path: string) => void>();

  const notify = () => {
    const path = WINDOW?.location?.pathname ?? "";
    listeners.forEach((listener) => listener(path));
  };

  const handlePopState = () => {
    notify();
  };

  const subscribe = (listener: (path: string) => void) => {
    listeners.add(listener);

    if (WINDOW) {
      WINDOW.addEventListener("popstate", handlePopState);
      WINDOW.addEventListener("statechanged", handlePopState);
    }

    return () => {
      listeners.delete(listener);
      if (WINDOW) {
        WINDOW.removeEventListener("popstate", handlePopState);
        WINDOW.removeEventListener("statechanged", handlePopState);
      }
    };
  };

  return {
    getPath: () => WINDOW?.location?.pathname ?? "",
    subscribe,
    push: (path: string, title: string = "") => {
      if (!WINDOW?.history) {
        return;
      }
      WINDOW.history.pushState({}, title, path);
      notify();
    },
    replace: (path: string, title: string = "") => {
      if (!WINDOW?.history?.replaceState) {
        return;
      }
      WINDOW.history.replaceState({}, title, path);
      notify();
    },
  };
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

    WINDOW.document.addEventListener("click", handleAnchorClick);

    return () => {
      WINDOW.document.removeEventListener("click", handleAnchorClick);
    };
  }, [adapter]);
};

/**
 * Web RouteProvider using the browser adapter.
 */
export const RouteProvider = ({ children }: PropsWithChildren) => {
  const adapterRef = useRef<RouteAdapter | null>(null);

  if (!adapterRef.current) {
    adapterRef.current = createBrowserRouteAdapter();
  }

  useBrowserLinkInterceptor(adapterRef.current);

  return (
    <CoreRouteProvider adapter={adapterRef.current}>
      {children}
    </CoreRouteProvider>
  );
};

/**
 * Web Route component that auto-provides the browser adapter at the top level.
 */
export const Route = <ParamsType extends Record<string, any>>(
  props: PropsWithChildren<RouteProps<ParamsType>>,
) => {
  const routeContext = useRouteContext();
  const hasAdapter = useMemo(
    () => typeof routeContext.adapter !== "undefined",
    [routeContext.adapter],
  );

  if (hasAdapter) {
    return <CoreRoute {...props} />;
  }

  return (
    <RouteProvider>
      <CoreRoute {...props} />
    </RouteProvider>
  );
};

export { useRouteContext };
