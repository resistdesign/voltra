/**
 * @packageDocumentation
 *
 * Loader hook for remote application state values. Calls a service endpoint,
 * tracks loading/error state, and populates ApplicationState via identifiers.
 */
import {
  ApplicationStateIdentifier,
  type ApplicationStateValue,
  type ApplicationStateValueController,
  useApplicationStateValue,
} from "./ApplicationState";
import { sendServiceRequest, ServiceConfig } from "./Service";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Access and track the loading of an application state value.
 * */
export type ApplicationStateLoader<
  ValueType = ApplicationStateValue,
  ArgsType extends any[] = any[],
> = ApplicationStateValueController<ValueType> & {
  /**
   * Whether the current request is in flight.
   * */
  loading: boolean;
  /**
   * The most recent error, if any.
   * */
  latestError: any;
  /**
   * Force a reload by invalidating the internal cache key.
   * */
  invalidate: () => void;
  /**
   * Trigger a remote procedure call with the provided args.
   *
   * @param args - Arguments to send with the request.
   * */
  makeRemoteProcedureCall: (...args: ArgsType) => Promise<void>;
};

/**
 * The service, path and arguments to use for a remote procedure call.
 * */
export type RemoteProcedureCall<ArgsType extends any[] = any[]> = {
  /**
   * Configuration for the target service endpoint.
   * */
  serviceConfig: ServiceConfig;
  /**
   * Path to the RPC handler.
   * */
  path: string;
  /**
   * Default args to send when the call auto-runs.
   * */
  args?: ArgsType;
};

/**
 * The configuration for an application state loader.
 * */
export type ApplicationStateLoaderConfig<
  ValueType = ApplicationStateValue,
  ArgsType extends any[] = any[],
> = {
  /**
   * Identifier for the value to update in application state.
   * */
  identifier: ApplicationStateIdentifier<ValueType>;
  /**
   * RPC target configuration and arguments.
   * */
  remoteProcedureCall: RemoteProcedureCall<ArgsType>;
  /**
   * Clear the application state value on error.
   *
   * @default false
   * */
  resetOnError?: boolean;
  /**
   * Called each time the application state value has been loaded.
   *
   * @param success - Whether the request completed successfully.
   * */
  onLoadComplete?: (success: boolean) => void;
  /**
   * Prevent automatic loading of the application state value and call the `RemoteProcedureCall` manually with `makeRemoteProcedureCall` on the `ApplicationStateLoader`.
   *
   * @default false
   * */
  manual?: boolean;
};

/**
 * Load, track and access an application state value.
 *
 * The returned object intentionally combines the remote-loading lifecycle with
 * the same stable local controller contract as
 * {@link useApplicationStateValue}. That keeps a loader-backed state value
 * usable like normal React state once it has been identified.
 *
 * @param config - Loader configuration for state identifier and RPC details.
 * @returns Loader controls and request state.
 * */
export const useApplicationStateLoader = <
  ValueType = ApplicationStateValue,
  ArgsType extends any[] = any[],
>(
  config: ApplicationStateLoaderConfig<ValueType, ArgsType>,
): ApplicationStateLoader<ValueType, ArgsType> => {
  const {
    identifier,
    remoteProcedureCall,
    resetOnError = false,
    onLoadComplete,
    manual = false,
  } = config;
  const { args = [] as unknown as ArgsType } = remoteProcedureCall;
  const argsRef = useRef<ArgsType>(args);
  argsRef.current = args;
  const [cacheValidity, setCacheValidity] = useState<{}>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [latestError, setLatestError] = useState<any>();
  const valueController = useApplicationStateValue<ValueType>(identifier);
  const { onChange, setModified } = valueController;
  const invalidate = useCallback(() => {
    setCacheValidity({});
  }, []);
  const makeRemoteProcedureCall = useCallback(
    async (...directArgs: ArgsType) => {
      let success = false;

      setLoading(true);
      setLatestError(undefined);

      try {
        const { serviceConfig, path } = remoteProcedureCall;
        const result = await sendServiceRequest(
          serviceConfig,
          path,
          directArgs,
        );

        success = true;

        onChange(result);
        setModified(false);
      } catch (error) {
        success = false;

        setLatestError(error);

        if (resetOnError) {
          onChange(undefined);
          setModified(false);
        }
      }

      setLoading(false);

      onLoadComplete?.(success);
    },
    [remoteProcedureCall, onChange, setModified, resetOnError, onLoadComplete],
  );
  const appStateLoader = useMemo(
    () => ({
      ...valueController,
      loading,
      latestError,
      invalidate,
      makeRemoteProcedureCall,
    }),
    [valueController, loading, latestError, invalidate, makeRemoteProcedureCall],
  );

  useEffect(() => {
    if (!manual && argsRef.current) {
      makeRemoteProcedureCall(...argsRef.current);
    }
  }, [cacheValidity, manual, makeRemoteProcedureCall]);

  return appStateLoader;
};
