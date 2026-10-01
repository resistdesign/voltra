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
import {
  sendServiceRequest,
  type ServiceConfig,
  type ServiceRequestConfig,
} from "./Service";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Result of an imperative Application State Loader request.
 * */
export type ApplicationStateLoaderRequestResult<ValueType> =
  | {
      status: "success";
      value: ValueType;
    }
  | {
      status: "error";
      error: any;
    }
  | {
      status: "cancelled";
    };

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
   * Cancel and invalidate all currently pending requests owned by this loader
   * without starting a replacement request.
   * */
  cancelPendingRequest: () => void;
  /**
   * Trigger a remote procedure call with the provided args.
   *
   * The identified application-state value is still updated on success. The
   * returned result lets imperative flows coordinate success, failure, and
   * cancellation without bypassing the loader or duplicating request state.
   *
   * @param args - Arguments to send with the request.
   * */
  makeRemoteProcedureCall: (
    ...args: ArgsType
  ) => Promise<ApplicationStateLoaderRequestResult<ValueType>>;
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
> = Omit<ServiceRequestConfig, "signal"> & {
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
   * Called each time the application state value has completed successfully or
   * with an error. Cancelled or superseded requests do not invoke this callback.
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
    cancelPendingOnNewRequest = false,
  } = config;
  const { args = [] as unknown as ArgsType } = remoteProcedureCall;
  const argsRef = useRef<ArgsType>(args);
  const requestSequenceRef = useRef(0);
  const requestAbortControllersRef = useRef(new Map<number, AbortController>());
  argsRef.current = args;
  const [cacheValidity, setCacheValidity] = useState<{}>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [latestError, setLatestError] = useState<any>();
  const valueController = useApplicationStateValue<ValueType>(identifier);
  const { onChange, setModified } = valueController;
  const invalidate = useCallback(() => {
    setCacheValidity({});
  }, []);
  const cancelPendingRequest = useCallback(() => {
    requestSequenceRef.current += 1;

    for (const abortController of requestAbortControllersRef.current.values()) {
      abortController.abort();
    }

    requestAbortControllersRef.current.clear();
    setLoading(false);
  }, []);
  const makeRemoteProcedureCall = useCallback(
    async (
      ...directArgs: ArgsType
    ): Promise<ApplicationStateLoaderRequestResult<ValueType>> => {
      const requestSequence = ++requestSequenceRef.current;
      const requestAbortController = new AbortController();
      let completionSuccess: boolean | undefined;
      let requestResult: ApplicationStateLoaderRequestResult<ValueType> = {
        status: "cancelled",
      };

      requestAbortControllersRef.current.set(
        requestSequence,
        requestAbortController,
      );

      setLoading(true);
      setLatestError(undefined);

      try {
        const { serviceConfig, path } = remoteProcedureCall;
        const result = (await sendServiceRequest(
          serviceConfig,
          path,
          directArgs,
          {
            cancelPendingOnNewRequest,
            signal: requestAbortController.signal,
          },
        )) as ValueType;

        if (requestSequence === requestSequenceRef.current) {
          completionSuccess = true;
          onChange(result);
          setModified(false);
          requestResult = {
            status: "success",
            value: result,
          };
        }
      } catch (error) {
        const cancelled =
          requestSequence !== requestSequenceRef.current ||
          ((error as { name?: string } | undefined)?.name === "AbortError");

        if (!cancelled) {
          completionSuccess = false;
          setLatestError(error);

          if (resetOnError) {
            onChange(undefined);
            setModified(false);
          }

          requestResult = {
            status: "error",
            error,
          };
        }
      } finally {
        requestAbortControllersRef.current.delete(requestSequence);

        if (requestSequence === requestSequenceRef.current) {
          setLoading(false);

          if (completionSuccess !== undefined) {
            onLoadComplete?.(completionSuccess);
          }
        }
      }

      return requestResult;
    },
    [
      remoteProcedureCall,
      onChange,
      setModified,
      resetOnError,
      onLoadComplete,
      cancelPendingOnNewRequest,
    ],
  );
  const appStateLoader = useMemo(
    () => ({
      ...valueController,
      loading,
      latestError,
      invalidate,
      cancelPendingRequest,
      makeRemoteProcedureCall,
    }),
    [
      valueController,
      loading,
      latestError,
      invalidate,
      cancelPendingRequest,
      makeRemoteProcedureCall,
    ],
  );

  useEffect(() => {
    if (!manual && argsRef.current) {
      void makeRemoteProcedureCall(...argsRef.current);
    }
  }, [cacheValidity, manual, makeRemoteProcedureCall]);

  useEffect(
    () => () => {
      requestSequenceRef.current += 1;

      for (const abortController of requestAbortControllersRef.current.values()) {
        abortController.abort();
      }

      requestAbortControllersRef.current.clear();
    },
    [],
  );

  return appStateLoader;
};
