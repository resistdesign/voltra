import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useRouteContext } from "../../app/utils/Route";
const loadRouteModule = async () => {
  const moduleUrl = new URL("./Route.tsx", import.meta.url);
  moduleUrl.search = `?t=${Date.now()}`;
  return import(moduleUrl.href);
};

type WindowListenerMap = Record<string, (event: any) => void>;

export const buildWindowMock = (pathname: string) => {
  const listeners: WindowListenerMap = {};
  const documentListeners: WindowListenerMap = {};
  const historyCalls: any[] = [];

  const history = {
    pushState: (state: any, title?: string, url?: string) => {
      historyCalls.push({ state, title, url });
      return undefined;
    },
  };

  const windowMock = {
    location: { pathname },
    history,
    document: {
      addEventListener: (event: string, handler: (ev: any) => void) => {
        documentListeners[event] = handler;
      },
      removeEventListener: (event: string) => {
        delete documentListeners[event];
      },
    },
    addEventListener: (event: string, handler: (ev: any) => void) => {
      listeners[event] = handler;
    },
    removeEventListener: (event: string) => {
      delete listeners[event];
    },
    dispatchEvent: (event: { type: string }) => {
      const handler = listeners[event.type];
      if (handler) {
        handler(event);
      }
    },
  };

  return {
    windowMock,
    historyCalls,
  };
};

export const runRouteScenario = async () => {
  const originalWindow = (globalThis as any).window;
  const originalCustomEvent = (globalThis as any).CustomEvent;

  const { windowMock } = buildWindowMock("/app/books/42");
  (globalThis as any).window = windowMock;
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;

    constructor(type: string, init: { detail?: any }) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  const routeModule = await loadRouteModule();
  const { Route } = routeModule;

  const ContextProbe = () => {
    const context = useRouteContext();
    return createElement("span", null, JSON.stringify(context));
  };

  const defaultContextRender = renderToString(
    createElement(Route, null, createElement(ContextProbe)),
  );

  const nestedRouteRender = renderToString(
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

  const exactMismatchRender = renderToString(
    createElement(
      Route,
      null,
      createElement(
        Route,
        { path: "/app/books", exact: true },
        createElement("span", null, "nope"),
      ),
    ),
  );

  const multiPathRender = renderToString(
    createElement(
      Route,
      null,
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          { path: ["magazines/:id", "books/:id"], exact: true },
          createElement(ContextProbe),
        ),
      ),
    ),
  );

  (globalThis as any).window = originalWindow;
  (globalThis as any).CustomEvent = originalCustomEvent;

  return {
    hasRouteExport: typeof routeModule.Route === "function",
    hasRouteProviderExport: "RouteProvider" in routeModule,
    defaultContextRender,
    nestedRouteRender,
    exactMismatchRender,
    multiPathRender,
  };
};

export const runRouteHasRouteExportScenario = async () =>
  (await runRouteScenario()).hasRouteExport;

export const runRouteHasRouteProviderExportScenario = async () =>
  (await runRouteScenario()).hasRouteProviderExport;

export const runRouteDefaultContextRenderScenario = async () =>
  (await runRouteScenario()).defaultContextRender;

export const runRouteNestedRouteRenderScenario = async () =>
  (await runRouteScenario()).nestedRouteRender;

export const runRouteExactMismatchRenderScenario = async () =>
  (await runRouteScenario()).exactMismatchRender;

export const runRouteMultiPathRenderScenario = async () =>
  (await runRouteScenario()).multiPathRender.includes("&quot;id&quot;:42");
