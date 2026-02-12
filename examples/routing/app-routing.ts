import { Route, createUniversalAdapter } from "@resistdesign/voltra/app";

/**
 * App/client routing reference example.
 *
 * Root Route is provider mode (no path); nested Route nodes are matchers.
 */
export const appRouteComponentExample = Route;

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
