/**
 * @packageDocumentation
 *
 * Native routing helpers that keep shared app Route semantics intact on mobile.
 *
 * The primary native model is still Voltra path/history routing. These helpers
 * supply the runtime selection needed by the `native` barrel:
 * - React Native mobile uses native history + deep-link + platform back
 * - React Native web uses the browser adapter
 *
 * This separation keeps `app` free of native-platform code.
 */
import { type PropsWithChildren, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import type {
  RouteProps,
  RouteRuntimeIntegration,
} from "../../app/utils/Route";
import type { RouteAdapter } from "../../app/utils/Route";
import { Route as CoreRoute } from "../../app/utils/Route";
import {
  createBrowserRouteAdapter,
} from "../../app/utils/UniversalRouteAdapter";
import { createRouteAdapterFromHistory } from "../../app/utils/RouteHistory";
import {
  createNativeHistory,
  type NativeBackHandlerLike,
} from "./History";

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
 * Low-level helper to build a Route runtime integration from a BackHandler.
 *
 * Native Route no longer uses this for the default path because platform back
 * ownership now lives with the native adapter/history layer. This remains
 * available for manual integrations.
 */
export const createNativeRouteBackIntegration = (
  backHandler: NativeBackHandlerLike,
): RouteRuntimeIntegration => {
  return {
    setup: (adapter) => registerNativeHardwareBackHandler(adapter, backHandler),
  };
};

/**
 * Native runtime environment inputs used by the native Route wrapper.
 */
type NativeRuntimeEnvironment = {
  platformOS: string;
  backHandler: NativeBackHandlerLike | undefined;
};

const createNativeHistoryRouteAdapter = (
  initialPath?: string,
  ingress?: RouteProps<Record<string, any>>["ingress"],
  backHandler?: NativeBackHandlerLike,
): RouteAdapter => {
  const history = createNativeHistory({
    initialPath,
    backHandler,
    ...(ingress
      ? {
          adapter: {
            getInitialURL: async () =>
              (await ingress.getInitialURL?.()) ?? null,
            subscribe: (listener) => ingress.subscribe?.(listener) ?? (() => {}),
          },
          onIncomingURL: ingress.onIncomingURL,
          mapURLToPath: ingress.mapURLToPath,
        }
      : {}),
  });
  const adapter = createRouteAdapterFromHistory(history);
  let subscribers = 0;

  return {
    ...adapter,
    subscribe: (listener) => {
      subscribers += 1;
      if (subscribers === 1) {
        void history.start();
      }

      const unlisten = adapter.subscribe(listener);
      return () => {
        unlisten();
        subscribers = Math.max(0, subscribers - 1);
        if (subscribers === 0) {
          history.stop();
        }
      };
    },
  };
};

/**
 * Native Route wrapper for root/provider mode.
 *
 * Behavior:
 * - On React Native mobile runtimes, auto-injects a native-history-backed
 *   adapter so native history owns platform back actions.
 * - On React Native web runtimes, auto-injects the browser adapter.
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
  const shouldUseAutoAdapter =
    !hasMatcherProps &&
    typeof props.adapter === "undefined";
  const routeProps = props as RouteProps<ParamsType>;
  const adapterRef = useRef<RouteAdapter | null>(null);

  if (shouldUseAutoAdapter && !adapterRef.current) {
    adapterRef.current =
      nativeRuntime.platformOS === "web"
        ? createBrowserRouteAdapter()
        : createNativeHistoryRouteAdapter(
            props.initialPath,
            props.ingress,
            nativeRuntime.backHandler,
          );
  }

  return shouldUseAutoAdapter ? (
    <CoreRoute
      {...routeProps}
      adapter={adapterRef.current ?? undefined}
    />
  ) : (
    <CoreRoute {...routeProps} />
  );
};
