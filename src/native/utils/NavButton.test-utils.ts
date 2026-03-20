import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { RouteProvider } from "../../app/utils/Route";
import { Route } from "./Route";
import { NavButton } from "./NavButton";

export const runNavButtonScenario = () => {
  let currentPath = "/app/books/42/details";
  const pushed: string[] = [];
  const replaced: string[] = [];
  let onPressCalls = 0;
  let capturedButtonElement: any = null;
  const adapter = {
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

  const CapturePushButton = () => {
    capturedButtonElement = NavButton({
      path: "review",
      id: "review-button",
      onPress: () => {
        onPressCalls += 1;
      },
      children: "Review",
    });
    return capturedButtonElement;
  };

  const pushRender = renderToString(
    createElement(
      RouteProvider,
      { adapter },
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          { path: "books/:id" },
          createElement(CapturePushButton),
        ),
      ),
    ),
  );

  capturedButtonElement.props.onPress({});

  currentPath = "/app/books/42/details";

  const CaptureReplaceButton = () => {
    capturedButtonElement = NavButton({
      path: "review",
      replace: true,
      children: "Review",
    });
    return capturedButtonElement;
  };

  renderToString(
    createElement(
      RouteProvider,
      { adapter },
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          { path: "books/:id" },
          createElement(CaptureReplaceButton),
        ),
      ),
    ),
  );

  capturedButtonElement.props.onPress({});

  return {
    rendersPressableButton: pushRender.includes("data-rn=\"Pressable\""),
    passesIdProp: pushRender.includes("id=\"review-button\""),
    onPressCalls,
    pushed,
    replaced,
  };
};
