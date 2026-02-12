import { Route, createUniversalAdapter } from "@resistdesign/voltra/app";

export const appRouteExample = Route;

export const appRouteIngressAdapterExample = createUniversalAdapter({
  initialPath: "/",
  ingress: {
    getInitialURL: async () => null,
    subscribe: () => () => {},
    onIncomingURL: "replace",
  },
});
