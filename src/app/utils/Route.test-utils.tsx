import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Route, useRouteContext } from "./Route";

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
