import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Route } from "../../app/utils/Route";
import { NavLink } from "./NavLink";

const buildClickEvent = () => {
  let prevented = false;

  return {
    button: 0,
    metaKey: false,
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    get defaultPrevented() {
      return prevented;
    },
    preventDefault: () => {
      prevented = true;
    },
  };
};

export const runNavLinkScenario = () => {
  let currentPath = "/app/books/42/details";
  const pushed: string[] = [];
  const replaced: string[] = [];
  let onClickCalls = 0;
  let capturedLinkElement: any = null;
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

  const CapturePushLink = () => {
    capturedLinkElement = NavLink({
      path: "review",
      title: "Review",
      id: "push-link",
      onClick: () => {
        onClickCalls += 1;
      },
      children: "Review",
    });
    return capturedLinkElement;
  };

  const pushRender = renderToString(
    createElement(
      Route,
      { adapter },
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          { path: "books/:id" },
          createElement(CapturePushLink),
        ),
      ),
    ),
  );

  const pushClickEvent = buildClickEvent();
  capturedLinkElement.props.onClick(pushClickEvent);

  currentPath = "/app/books/42/details";

  const CaptureReplaceLink = () => {
    capturedLinkElement = NavLink({
      path: "review",
      replace: true,
      children: "Review",
    });
    return capturedLinkElement;
  };

  renderToString(
    createElement(
      Route,
      { adapter },
      createElement(
        Route,
        { path: "/app" },
        createElement(
          Route,
          { path: "books/:id" },
          createElement(CaptureReplaceLink),
        ),
      ),
    ),
  );

  const replaceClickEvent = buildClickEvent();
  capturedLinkElement.props.onClick(replaceClickEvent);

  return {
    pushHrefResolved: pushRender.includes("href=\"/app/books/42/review\""),
    pushIdPropPassed: pushRender.includes("id=\"push-link\""),
    onClickCalls,
    pushed,
    replaced,
    pushPreventedDefault: pushClickEvent.defaultPrevented,
    replacePreventedDefault: replaceClickEvent.defaultPrevented,
  };
};
