import {
  ApplicationStateIdentifier,
  useApplicationStateValue,
} from "./ApplicationState";
import { sendServiceRequest, ServiceConfig } from "./Service";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ApplicationStateLoader = {
  loading: boolean;
  latestError: any;
  invalidate: () => void;
  makeRemoteProcedureCall: (...args: any[]) => Promise<void>;
};

export type RemoteProcedureCall = {
  serviceConfig: ServiceConfig;
  path: string;
  args?: any[];
};

export type ApplicationStateLoaderConfig = {
  identifier: ApplicationStateIdentifier;
  remoteProcedureCall: RemoteProcedureCall;
  resetOnError?: boolean;
  onLoadComplete?: (success: boolean) => void;
  manual?: boolean;
};

export const useApplicationStateLoader = (
  config: ApplicationStateLoaderConfig,
): ApplicationStateLoader => {
  const {
    identifier,
    remoteProcedureCall,
    resetOnError = false,
    onLoadComplete,
    manual = false,
  } = config;
  const { args = [] } = remoteProcedureCall;
  const argsRef = useRef<any[]>(args);
  argsRef.current = args;
  const [cacheValidity, setCacheValidity] = useState<{}>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [latestError, setLatestError] = useState<any>();
  const { onChange } = useApplicationStateValue(identifier);
  const invalidate = useCallback(() => {
    setCacheValidity({});
  }, []);
  const makeRemoteProcedureCall = useCallback(
    async (...directArgs: any[]) => {
      let success;

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
      } catch (error) {
        success = false;

        setLatestError(error);

        if (resetOnError) {
          onChange(undefined);
        }
      }

      setLoading(false);

      onLoadComplete?.(success);
    },
    [remoteProcedureCall, onChange, resetOnError, onLoadComplete],
  );
  const appStateLoader = useMemo(
    () => ({
      loading,
      latestError,
      invalidate,
      makeRemoteProcedureCall,
    }),
    [loading, latestError, invalidate, makeRemoteProcedureCall],
  );

  useEffect(() => {
    if (!manual && argsRef.current) {
      makeRemoteProcedureCall(...argsRef.current);
    }
  }, [cacheValidity, manual, makeRemoteProcedureCall]);

  return appStateLoader;
};
