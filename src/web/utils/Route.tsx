/**
 * @packageDocumentation
 *
 * Web routing exports unified app Route implementation.
 */
import React, { PropsWithChildren, useRef } from "react";
import {
  Route,
  RouteProvider as CoreRouteProvider,
  type RouteAdapter,
  useRouteContext,
} from "../../app/utils/Route";
import { createBrowserRouteAdapter } from "../../app/utils/UniversalRouteAdapter";

/**
 * Backward-compatible web RouteProvider that auto-creates a browser adapter.
 */
export const RouteProvider = ({ children }: PropsWithChildren) => {
  const adapterRef = useRef<RouteAdapter | null>(null);

  if (!adapterRef.current) {
    adapterRef.current = createBrowserRouteAdapter();
  }

  return (
    <CoreRouteProvider adapter={adapterRef.current}>
      {children}
    </CoreRouteProvider>
  );
};

export { Route, useRouteContext, createBrowserRouteAdapter };
export type {
  RouteAdapter,
  RouteContextType,
  RouteProps,
  RouteProviderProps,
  RouteQuery,
  RouteQueryValue,
} from "../../app/utils/Route";
