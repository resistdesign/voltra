import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  RouteProvider,
  createManualRouteAdapter,
} from "../../app/utils/Route";
import {
  Route,
  buildPathFromRouteChain,
  createNativeRouteBackIntegration,
  createNavigationStateRouteAdapter,
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

export const runNativeNavigationStateAdapterScenario = () => {
  let state = { index: 0, routes: [{ name: "Home" }] };
  const listeners = new Set<() => void>();

  const adapter = createNavigationStateRouteAdapter({
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    toPath: (nextState) => {
      const route = nextState.routes[nextState.index];
      return route.name === "Home" ? "/home" : "/unknown";
    },
    navigate: (path: string) => {
      state = { index: 0, routes: [{ name: path === "/home" ? "Home" : "Other" }] };
      listeners.forEach((listener) => listener());
    },
  });

  const initialPath = adapter.getPath();
  adapter.push?.("/home");
  const afterNavigatePath = adapter.getPath();

  return {
    initialPath,
    afterNavigatePath,
  };
};

export const runNativeRouteChainScenario = () => {
  const path = buildPathFromRouteChain(
    [
      { name: "Home" },
      { name: "Book", params: { id: 42 } },
    ],
    {
      Home: "home",
      Book: "books/:id",
    },
    { view: "summary", debug: true },
  );

  return {
    path,
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
