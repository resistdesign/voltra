/**
 * @packageDocumentation
 *
 * Web routing wrapper that preserves the `Route` API while injecting
 * browser-specific mechanics for root route usage.
 */
import { PropsWithChildren, useRef } from "react";
import {
  Route as CoreRoute,
  type RouteAdapter,
  type RouteProps,
} from "../../app/utils/Route";
import { createBrowserRouteAdapter } from "../../app/utils/UniversalRouteAdapter";

/**
 * Web Route wrapper.
 *
 * Behavior:
 * - In matcher mode (`path` / `exact` / `onParamsChange`), behaves like core `Route`.
 * - In root/provider mode, auto-injects a browser adapter unless one is supplied.
 */
export const Route = <ParamsType extends Record<string, any>>(
  props: PropsWithChildren<RouteProps<ParamsType>>,
) => {
  const hasMatcherProps =
    typeof props.path !== "undefined" ||
    typeof props.exact !== "undefined" ||
    typeof props.onParamsChange !== "undefined";
  const adapterRef = useRef<RouteAdapter | null>(null);
  const shouldInjectBrowserAdapter =
    !hasMatcherProps &&
    typeof props.adapter === "undefined" &&
    typeof props.ingress === "undefined";

  if (shouldInjectBrowserAdapter && !adapterRef.current) {
    adapterRef.current = createBrowserRouteAdapter();
  }

  return shouldInjectBrowserAdapter ? (
    <CoreRoute
      {...(props as RouteProps<ParamsType>)}
      adapter={adapterRef.current ?? undefined}
    />
  ) : (
    <CoreRoute {...(props as RouteProps<ParamsType>)} />
  );
};
