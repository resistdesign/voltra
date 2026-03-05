import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  Route,
  useRouteContext,
  wrapRouteAdapterWithPathResolver,
} from "./Route";

const ContextProbe = () => {
  const context = useRouteContext();
  return createElement(
    "span",
    null,
    JSON.stringify({
      currentWindowPath: context.currentWindowPath,
      params: context.params,
      isTopLevel: context.isTopLevel,
      hasAdapter: typeof context.adapter !== "undefined",
    }),
  );
};

type WindowListenerMap = Record<string, (event: any) => void>;

const buildWindowMock = (pathname: string) => {
  const listeners: WindowListenerMap = {};
  const history = {
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
  };

  const windowMock = {
    location: { pathname },
    history,
    addEventListener: (event: string, handler: (ev: any) => void) => {
      listeners[event] = handler;
    },
    removeEventListener: (event: string) => {
      delete listeners[event];
    },
  };

  return windowMock;
};

export const runAppRouteProviderScenario = () => {
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = buildWindowMock("/app/books/42");

  const rootRender = renderToString(
    createElement(Route, null, createElement(ContextProbe)),
  );

  const nestedRender = renderToString(
    createElement(
      Route,
      null,
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          { path: "books/:id", exact: true },
          createElement(ContextProbe),
        ),
      ),
    ),
  );

  (globalThis as any).window = originalWindow;

  return {
    rootProvidesAdapter: rootRender.includes("&quot;hasAdapter&quot;:true"),
    rootIsTopLevel: rootRender.includes("&quot;isTopLevel&quot;:true"),
    nestedMatchHasPath:
      nestedRender.includes("&quot;currentWindowPath&quot;:&quot;/app/books/42&quot;"),
    nestedMatchHasParam: nestedRender.includes("&quot;id&quot;:42"),
    nestedMatchIsNested: nestedRender.includes("&quot;isTopLevel&quot;:false"),
  };
};

export const runAppRouteNoDOMScenario = () => {
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = undefined;

  const render = renderToString(
    createElement(
      Route,
      null,
      createElement(
        Route,
        { path: "/", exact: true },
        createElement(ContextProbe),
      ),
    ),
  );

  (globalThis as any).window = originalWindow;

  return {
    defaultPathIsSlash: render.includes("&quot;currentWindowPath&quot;:&quot;/&quot;"),
    rootProvidesAdapter: render.includes("&quot;hasAdapter&quot;:true"),
  };
};

export const runAppRouteExactWithoutPathScenario = () => {
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = buildWindowMock("/");

  const render = renderToString(
    createElement(
      Route,
      null,
      createElement(
        Route,
        { exact: true },
        createElement(ContextProbe),
      ),
    ),
  );

  (globalThis as any).window = originalWindow;

  return {
    exactWithoutPathRenders: render.includes("&quot;isTopLevel&quot;:false"),
    exactWithoutPathHasAdapter: render.includes("&quot;hasAdapter&quot;:true"),
  };
};

export const runAppRouteRuntimeIntegrationMatcherGuardScenario = () => {
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = buildWindowMock("/app");

  let threw = false;
  let messageIncludesRuntimeIntegration = false;

  try {
    renderToString(
      createElement(
        Route,
        {
          path: "/app",
          runtimeIntegration: {
            setup: () => () => {},
          },
        },
        createElement("div", null, "x"),
      ),
    );
  } catch (error) {
    threw = true;
    messageIncludesRuntimeIntegration = String(error).includes(
      "runtimeIntegration",
    );
  }

  (globalThis as any).window = originalWindow;

  return {
    threw,
    messageIncludesRuntimeIntegration,
  };
};

export const runAppRouteAdapterWrapperRelativePathScenario = () => {
  let currentPath = "/signup/complete";
  const pushed: string[] = [];
  const replaced: string[] = [];
  const rawAdapter = {
    getPath: () => currentPath,
    subscribe: () => () => {},
    push: (path: string) => {
      pushed.push(path);
      currentPath = path;
    },
    replace: (path: string) => {
      replaced.push(path);
      currentPath = path;
    },
  };
  const adapter = wrapRouteAdapterWithPathResolver(rawAdapter);

  adapter.push?.("../../login");
  adapter.replace?.("");

  return {
    pushed,
    replaced,
    finalPath: currentPath,
  };
};

export const runAppRouteMultiPathScenario = () => {
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = buildWindowMock("/app/movies/42");

  const multiPathRender = renderToString(
    createElement(
      Route,
      null,
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          { path: ["books/:id", "movies/:id"], exact: true },
          createElement(ContextProbe),
        ),
      ),
    ),
  );

  const noMatchRender = renderToString(
    createElement(
      Route,
      null,
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          { path: ["books/:id", "authors/:id"], exact: true },
          createElement(ContextProbe),
        ),
      ),
    ),
  );

  (globalThis as any).window = originalWindow;

  return {
    matchedSecondPath: multiPathRender.includes("&quot;id&quot;:42"),
    noMatchRenderIsEmpty: noMatchRender === "",
  };
};
