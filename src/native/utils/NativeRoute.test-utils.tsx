import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useRouteContext } from "../../app/utils/Route";
import { createNativeHistory } from "./History";
import { NativeRoute, NativeRouteProvider } from "./NativeRoute";

const RouteContextProbe = () => {
  const context = useRouteContext();
  return createElement(
    "span",
    null,
    JSON.stringify({
      currentWindowPath: context.currentWindowPath,
      params: context.params,
      isTopLevel: context.isTopLevel,
    }),
  );
};

const renderRouteTree = (history: ReturnType<typeof createNativeHistory>) =>
  renderToString(
    createElement(
      NativeRouteProvider,
      { history },
      createElement(
        NativeRoute,
        { path: "/app" },
        createElement(
          NativeRoute,
          { path: "books/:id", exact: true },
          createElement(RouteContextProbe),
        ),
      ),
    ),
  );

export const runNativeRouteProviderHistoryScenario = () => {
  const history = createNativeHistory({ initialPath: "/app/books/42" });

  const initialRender = renderRouteTree(history);
  history.push("/app/books/99", { replaceSearch: true });
  const updatedRender = renderRouteTree(history);

  return {
    initialHasPath:
      initialRender.includes("currentWindowPath") &&
      initialRender.includes("/app/books/42"),
    initialHasId: initialRender.includes("&quot;id&quot;:42"),
    initialIsNested: initialRender.includes("&quot;isTopLevel&quot;:false"),
    updatedHasPath:
      updatedRender.includes("currentWindowPath") &&
      updatedRender.includes("/app/books/99"),
    updatedHasId: updatedRender.includes("&quot;id&quot;:99"),
    updatedIsNested: updatedRender.includes("&quot;isTopLevel&quot;:false"),
  };
};
