/**
 * @packageDocumentation
 *
 * Native routing helpers that keep shared app Route semantics intact on mobile.
 *
 * The primary native model is still Voltra path/history routing. These helpers
 * supply the mobile-only runtime pieces around that model, such as hardware
 * back integration.
 */
import { type PropsWithChildren } from "react";
import { BackHandler, Platform } from "react-native";
import type {
  RouteAdapter,
  RouteProps,
  RouteRuntimeIntegration,
} from "../../app/utils/Route";
import { Route as CoreRoute } from "../../app/utils/Route";

/**
 * Contract for React Native BackHandler-like integrations.
 */
export type NativeBackHandlerLike = {
  addEventListener: (
    eventName: "hardwareBackPress",
    listener: () => boolean,
  ) => { remove?: () => void } | void;
  removeEventListener?: (
    eventName: "hardwareBackPress",
    listener: () => boolean,
  ) => void;
};

/**
 * Create a hardware-back listener from a route adapter.
 */
export const createNativeHardwareBackHandler = (adapter: RouteAdapter) => {
  return () => {
    if (adapter.canGoBack?.()) {
      adapter.back?.();
      return true;
    }

    return false;
  };
};

/**
 * Register hardware-back handling against a BackHandler-like runtime.
 */
export const registerNativeHardwareBackHandler = (
  adapter: RouteAdapter,
  backHandler: NativeBackHandlerLike,
) => {
  const listener = createNativeHardwareBackHandler(adapter);
  const subscription = backHandler.addEventListener(
    "hardwareBackPress",
    listener,
  );

  return () => {
    if (typeof subscription?.remove === "function") {
      subscription.remove();
      return;
    }

    backHandler.removeEventListener?.("hardwareBackPress", listener);
  };
};

/**
 * Build a core Route runtime integration using a native BackHandler.
 */
export const createNativeRouteBackIntegration = (
  backHandler: NativeBackHandlerLike,
): RouteRuntimeIntegration => {
  return {
    setup: (adapter) => registerNativeHardwareBackHandler(adapter, backHandler),
  };
};

type NativeRuntimeEnvironment = {
  platformOS: string;
  backHandler: NativeBackHandlerLike | undefined;
};

/**
 * Native Route wrapper for root/provider mode.
 *
 * Behavior:
 * - On mobile native runtimes, injects back-handler integration into app Route.
 * - On web runtimes, passes no integration so app Route uses browser behavior.
 */
export const Route = <ParamsType extends Record<string, any>,>(
  props: PropsWithChildren<RouteProps<ParamsType>>,
) => {
  const hasMatcherProps =
    typeof props.path !== "undefined" ||
    typeof props.exact !== "undefined" ||
    typeof props.onParamsChange !== "undefined";
  const nativeRuntime: NativeRuntimeEnvironment = {
    platformOS: String(Platform?.OS ?? ""),
    backHandler: BackHandler as NativeBackHandlerLike,
  };
  const runtimeIntegration = (() => {
    if (hasMatcherProps || nativeRuntime.platformOS === "web") {
      return undefined;
    }

    const backHandler = nativeRuntime.backHandler;
    if (!backHandler) {
      return undefined;
    }

    return createNativeRouteBackIntegration(backHandler);
  })();

  return (
    <CoreRoute
      {...(props as RouteProps<ParamsType>)}
      runtimeIntegration={runtimeIntegration}
    />
  );
};
