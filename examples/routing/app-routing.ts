import { createUniversalAdapter } from "@resistdesign/voltra/app";
import { Route as NativeRoute } from "@resistdesign/voltra/native";
import { Route as WebRoute } from "@resistdesign/voltra/web";

/**
 * App/client routing reference examples.
 *
 * Root Route is provider mode (no path); nested Route nodes are matchers.
 * Use platform barrels for the Route component so runtime mechanics are wired
 * for the current environment. The routing model is path/history based on both
 * web and native. The `native` barrel handles both React Native mobile and
 * React Native web targets without leaking native platform code into `app`.
 */
export const webRouteComponentExample = WebRoute;
export const nativeRouteComponentExample = NativeRoute;

/**
 * Native default behavior:
 * - Voltra provides history-style path state for mobile environments.
 * - Android hardware back is auto-wired to that route history.
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
 * Native deep-link ingress reference:
 * map native URL opens into the same path/history model that web uses.
 */
export const appRouteIngressAdapterExample = createUniversalAdapter({
  initialPath: "/",
  ingress: {
    getInitialURL: async () => null,
    subscribe: () => () => {},
    onIncomingURL: "replace",
  },
});
