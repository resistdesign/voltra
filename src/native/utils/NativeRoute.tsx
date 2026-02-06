/**
 * @packageDocumentation
 *
 * Native Route wrappers that bridge native history into app Route context.
 */
import React, { PropsWithChildren, useEffect, useMemo, useRef } from "react";
import {
  Route as CoreRoute,
  RouteProvider as CoreRouteProvider,
  type RouteProps,
  useRouteContext,
} from "../../app/utils/Route";
import { createRouteAdapterFromHistory } from "../../app/utils/RouteHistory";
import {
  createNativeHistory,
  type CreateNativeHistoryOptions,
  type NativeHistoryController,
} from "./History";

/**
 * Native route-provider props.
 */
export type NativeRouteProviderProps = PropsWithChildren<
  CreateNativeHistoryOptions & {
    /**
     * Optional externally managed history instance.
     *
     * When provided, `CreateNativeHistoryOptions` are ignored for construction
     * and the provider will use this instance directly.
     */
    history?: NativeHistoryController;
  }
>;

/**
 * Native RouteProvider that starts/stops native history lifecycle automatically.
 *
 * Behavior:
 * - If `history` is provided, it is used as-is.
 * - Otherwise, a history instance is created once from options.
 * - On mount: calls `history.start()`.
 * - On unmount: calls `history.stop()`.
 *
 * Example:
 * ```tsx
 * <NativeRouteProvider adapter={linkingAdapter}>
 *   <NativeRoute path="/app" />
 * </NativeRouteProvider>
 * ```
 */
export const NativeRouteProvider = ({
  children,
  history,
  ...historyOptions
}: NativeRouteProviderProps) => {
  const historyRef = useRef<NativeHistoryController | null>(history ?? null);
  if (!historyRef.current) {
    historyRef.current = createNativeHistory(historyOptions);
  }

  const adapterRef = useRef(createRouteAdapterFromHistory(historyRef.current));

  useEffect(() => {
    const targetHistory = historyRef.current;
    if (!targetHistory) {
      return;
    }

    void targetHistory.start();
    return () => {
      targetHistory.stop();
    };
  }, []);

  return (
    <CoreRouteProvider adapter={adapterRef.current}>{children}</CoreRouteProvider>
  );
};

/**
 * Native Route component that auto-provides native history at the top level.
 *
 * If a route adapter already exists in context, this renders the core route
 * directly. Otherwise it creates a top-level {@link NativeRouteProvider}.
 */
export const NativeRoute = <ParamsType extends Record<string, any>>(
  props: PropsWithChildren<RouteProps<ParamsType>>,
) => {
  const routeContext = useRouteContext();
  const hasAdapter = useMemo(
    () => typeof routeContext.adapter !== "undefined",
    [routeContext.adapter],
  );

  if (hasAdapter) {
    return <CoreRoute {...props} />;
  }

  return (
    <NativeRouteProvider>
      <CoreRoute {...props} />
    </NativeRouteProvider>
  );
};
