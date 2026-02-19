/**
 * @packageDocumentation
 *
 * Web routing exports unified app Route implementation.
 */
import React, { PropsWithChildren, useRef } from "react";
import {
  RouteProvider as CoreRouteProvider,
  type RouteAdapter,
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
