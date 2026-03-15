import { createElement } from "react";
import { renderToString } from "react-dom/server";
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
