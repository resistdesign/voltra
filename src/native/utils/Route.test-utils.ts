import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Platform } from "react-native";
import {
  RouteProvider,
  createManualRouteAdapter,
} from "../../app/utils/Route";
import {
  Route,
  createNativeRouteBackIntegration,
  registerNativeHardwareBackHandler,
} from "./Route";

const renderNestedRoute = (adapter: ReturnType<typeof createManualRouteAdapter>) =>
  renderToString(
    createElement(
      RouteProvider,
      { adapter: adapter.adapter },
      createElement(
        Route,
        { path: "/app" },
        createElement(Route, { path: "books/:id", exact: true }, "ok"),
      ),
    ),
  );

export const runNativeManualAdapterScenario = () => {
  const manual = createManualRouteAdapter("/app/books/42");

  const initialRender = renderNestedRoute(manual);
  manual.updatePath("/app/books/99");
  const updatedRender = renderNestedRoute(manual);

  return {
    initialRender,
    updatedRender,
  };
};

export const runNativeManualAdapterMultiPathScenario = () => {
  const manual = createManualRouteAdapter("/app/books/42");

  const render = renderToString(
    createElement(
      RouteProvider,
      { adapter: manual.adapter },
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          { path: ["magazines/:id", "books/:id"], exact: true },
          "ok",
        ),
      ),
    ),
  );

  return {
    render,
  };
};

const buildWindowMock = (pathname: string) => {
  const listeners: Record<string, (event: any) => void> = {};

  const windowMock = {
    location: { pathname },
    history: {
      pushState: (_state: any, _title?: string, url?: string) => {
        if (typeof url === "string") {
          windowMock.location.pathname = url;
        }
      },
      replaceState: (_state: any, _title?: string, url?: string) => {
        if (typeof url === "string") {
          windowMock.location.pathname = url;
        }
      },
    },
    addEventListener: (event: string, handler: (ev: any) => void) => {
      listeners[event] = handler;
    },
    removeEventListener: (event: string) => {
      delete listeners[event];
    },
    dispatchEvent: (event: { type: string }) => {
      listeners[event.type]?.(event);
    },
  };

  return windowMock;
};

export const runNativeManualAdapterMixedPathConfigScenario = () => {
  const manual = createManualRouteAdapter("/app/books/42/details");

  const mixedRender = renderToString(
    createElement(
      RouteProvider,
      { adapter: manual.adapter },
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          {
            path: [
              { path: "books/:id", exact: false },
              { path: "movies/:id", exact: true },
            ],
            exact: true,
          },
          "ok",
        ),
      ),
    ),
  );

  const stringExactMismatchRender = renderToString(
    createElement(
      RouteProvider,
      { adapter: manual.adapter },
      createElement(
        Route,
        { path: "/app" },
        createElement(Route, { path: ["books/:id"], exact: true }, "ok"),
      ),
    ),
  );

  return {
    mixedRender,
    stringExactMismatchRender,
  };
};

export const runNativeRouteWebTargetScenario = () => {
  const originalWindow = (globalThis as any).window;
  const originalOS = Platform.OS;
  (Platform as { OS: string }).OS = "web";
  (globalThis as any).window = buildWindowMock("/app/books/42");

  const render = renderToString(
    createElement(
      Route,
      null,
      createElement(
        Route,
        { path: "/app" },
        createElement(Route, { path: "books/:id", exact: true }, "ok"),
      ),
    ),
  );

  (globalThis as any).window = originalWindow;
  (Platform as { OS: string }).OS = originalOS;

  return {
    render,
  };
};

export const runNativeBackIntegrationScenario = () => {
  const backEvents: string[] = [];
  let currentPath = "/a/b";

  const adapter = {
    getPath: () => currentPath,
    subscribe: () => () => {},
    back: () => {
      currentPath = "/a";
    },
    canGoBack: () => currentPath !== "/a",
  };

  const integration = createNativeRouteBackIntegration({
    addEventListener: (_eventName, listener) => {
      backEvents.push(listener() ? "consumed" : "ignored");
      return {
        remove: () => {
          backEvents.push("removed");
        },
      };
    },
  });

  const stop = integration.setup(adapter);
  stop?.();

  let removeFallbackCalls = 0;
  const stopFallback = registerNativeHardwareBackHandler(adapter, {
    addEventListener: (_eventName, listener) => {
      backEvents.push(listener() ? "consumed" : "ignored");
      return {};
    },
    removeEventListener: () => {
      removeFallbackCalls += 1;
    },
  });
  stopFallback();

  return {
    backEvents,
    finalPath: currentPath,
    removeFallbackCalls,
  };
};
