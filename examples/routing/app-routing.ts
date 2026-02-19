import { createUniversalAdapter } from "@resistdesign/voltra/app";
import { Route as NativeRoute } from "@resistdesign/voltra/native";
import { Route as WebRoute } from "@resistdesign/voltra/web";

/**
 * App/client routing reference examples.
 *
 * Root Route is provider mode (no path); nested Route nodes are matchers.
 * Use platform barrels for the Route component so runtime mechanics are wired
 * for the current environment.
 */
export const webRouteComponentExample = WebRoute;
export const nativeRouteComponentExample = NativeRoute;

/**
 * Native default behavior (escape hatch):
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
