import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  Route,
  RouteProvider,
  createManualRouteAdapter,
} from "../../app/utils/Route";
import { createNavigationStateRouteAdapter } from "./Route";

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
