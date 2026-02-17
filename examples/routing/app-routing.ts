import { Route, createUniversalAdapter } from "@resistdesign/voltra/app";

/**
 * App/client routing reference example.
 *
 * Root Route is provider mode (no path); nested Route nodes are matchers.
 */
export const appRouteComponentExample = Route;

/**
 * Native default behavior:
 * - In native strategy, Android hardware back is auto-wired to route history.
 * - If route history cannot go back, the OS/native container handles the event.
 */
export const appRouteNativeAdapterExample = createUniversalAdapter({
  strategy: "native",
  initialPath: "/",
});

/**
 * Optional UI back-button helper using adapter affordances.
 */
export const runAppRouteBackAction = () => {
  if (appRouteNativeAdapterExample.canGoBack?.()) {
    appRouteNativeAdapterExample.back?.();
    return true;
  }

  return false;
};

/**
 * Escape-hatch reference for advanced environments.
 */
export const appRouteIngressAdapterExample = createUniversalAdapter({
  initialPath: "/",
  ingress: {
    getInitialURL: async () => null,
    subscribe: () => () => {},
    onIncomingURL: "replace",
  },
});
