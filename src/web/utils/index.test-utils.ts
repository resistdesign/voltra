import * as WebUtils from "./index";

export const runWebUtilsIndexScenario = () => {
  return {
    hasEasyLayout: "getEasyLayout" in WebUtils,
    hasRoute: "Route" in WebUtils,
    hasNavLink: "NavLink" in WebUtils,
  };
};

export const runWebUtilsIndexHasEasyLayoutScenario = async () =>
  (await runWebUtilsIndexScenario()).hasEasyLayout;

export const runWebUtilsIndexHasRouteScenario = async () =>
  (await runWebUtilsIndexScenario()).hasRoute;

export const runWebUtilsIndexHasNavLinkScenario = async () =>
  (await runWebUtilsIndexScenario()).hasNavLink;
