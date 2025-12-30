/**
 * @packageDocumentation
 *
 * Hook utilities that wrap a {@link TypeInfoORMAPI} with request state tracking.
 * Each method returns a request id and updates loading/data/error state per method.
 */
import {
  TypeInfoORMAPI,
  TypeInfoORMServiceError,
} from "../../common/TypeInfoORM";
import { ExpandComplexType } from "../../common/HelperTypes";
import { useCallback, useMemo, useState } from "react";
import { getSimpleId } from "../../common/IdGeneration";

type RequestMethod = (...args: any[]) => Promise<any>;

/**
 * Sync request handler that returns a request id.
 *
 * @param args - Arguments for the API method.
 * @returns Request id for tracking.
 * */
export type SyncRequestHandler<ArgsType extends any[]> = (
  ...args: ArgsType
) => string;

/**
 * Synchronous wrapper API that returns a request id for each method.
 * */
export type TypeInfoORMServiceAPI = ExpandComplexType<{
  [K in keyof TypeInfoORMAPI]: TypeInfoORMAPI[K] extends (
    ...args: infer A
  ) => Promise<any>
    ? SyncRequestHandler<A>
    : TypeInfoORMAPI[K];
}>;

/**
 * Request state for a single TypeInfoORM API method.
 * */
export type BaseTypeInfoORMAPIRequestState = {
  /**
   * Whether the request is currently loading.
   * */
  loading?: boolean;
  /**
   * Latest successful response data.
   * */
  data?: any;
  /**
   * Latest request error.
   * */
  error?: TypeInfoORMServiceError;
};

/**
 * Request state plus tracking of active request ids.
 * */
export type TypeInfoORMAPIRequestState = ExpandComplexType<
  BaseTypeInfoORMAPIRequestState & {
    /**
     * Active request ids for this method.
     * */
    activeRequests?: string[];
  }
>;

type RequestStateChangeHandler = (
  methodName: keyof TypeInfoORMAPI,
  requestId: string,
  requestState: BaseTypeInfoORMAPIRequestState,
) => void;

/**
 * Request state keyed by TypeInfoORM API method.
 */
export type TypeInfoORMAPIState = Partial<
  Record<keyof TypeInfoORMAPI, TypeInfoORMAPIRequestState>
>;

/**
 * Hook return shape for request state and wrapped API.
 * */
export type TypeInfoORMAPIController = {
  /**
   * Request state keyed by method name.
   * */
  state: TypeInfoORMAPIState;
  /**
   * Wrapped API that returns request ids.
   * */
  api: TypeInfoORMServiceAPI;
};

/**
 * Execute a request and emit request state changes.
 *
 * @param requestId - Unique id for this request.
 * @param args - Arguments to pass to the API method.
 * @param typeInfoORMAPI - API instance to call.
 * @param methodName - Method name to invoke.
 * @param onRequestStateChange - Handler for request state updates.
 * @returns Promise resolved when request state is updated.
 * */
export const handleRequest = async (
  requestId: string,
  args: any[],
  typeInfoORMAPI: TypeInfoORMAPI,
  methodName: keyof TypeInfoORMAPI,
  onRequestStateChange: RequestStateChangeHandler,
): Promise<void> => {
  onRequestStateChange(methodName, requestId, { loading: true });

  try {
    const requestMethod: RequestMethod = typeInfoORMAPI[methodName];
    const result = await requestMethod(...args);

    onRequestStateChange(methodName, requestId, {
      loading: false,
      data: result,
    });
  } catch (error) {
    onRequestStateChange(methodName, requestId, {
      loading: false,
      error:
        typeof error === "object" && error !== null && "message" in error
          ? (error.message as TypeInfoORMServiceError)
          : undefined,
    });
  }
};

/**
 * Create a sync handler that dispatches async requests.
 *
 * @param typeInfoORMAPI - API instance to call.
 * @param methodName - Method name to invoke.
 * @param onRequestStateChange - Handler for request state updates.
 * @returns Sync handler that returns a request id.
 * */
export const requestHandlerFactory =
  (
    typeInfoORMAPI: TypeInfoORMAPI,
    methodName: keyof TypeInfoORMAPI,
    onRequestStateChange: RequestStateChangeHandler,
  ): SyncRequestHandler<any> =>
  (...args: any[]): string => {
    const requestId = getSimpleId();

    handleRequest(
      requestId,
      args,
      typeInfoORMAPI,
      methodName,
      onRequestStateChange,
    );

    return requestId;
  };

/**
 * Wrap a TypeInfoORM API instance with request tracking state.
 *
 * @param typeInfoORMAPI - API instance to wrap.
 * @returns Controller with request state and wrapped API methods.
 * */
export const useTypeInfoORMAPI = (
  typeInfoORMAPI: TypeInfoORMAPI,
): TypeInfoORMAPIController => {
  const [state, setState] = useState<TypeInfoORMAPIState>({});
  const onRequestStateChange = useCallback<RequestStateChangeHandler>(
    (methodName, requestId, { loading, data, error }) => {
      setState(
        ({
          [methodName]: {
            activeRequests: prevActiveRequests = [],
            data: prevData,
            error: prevError,
          } = {},
          ...prevState
        }) => {
          const newActiveRequests = loading
            ? [...prevActiveRequests, requestId]
            : prevActiveRequests.filter((id) => id !== requestId);
          const currentlyLoading = newActiveRequests.length > 0;

          return {
            ...prevState,
            [methodName]: {
              activeRequests: newActiveRequests,
              loading: currentlyLoading,
              data: currentlyLoading ? undefined : (data ?? prevData),
              error: currentlyLoading ? undefined : (error ?? prevError),
            },
          };
        },
      );
    },
    [],
  );
  const api = useMemo<TypeInfoORMServiceAPI>(() => {
    const apiBase: Partial<TypeInfoORMServiceAPI> = {};

    for (const aM in typeInfoORMAPI) {
      const methodName = aM as keyof TypeInfoORMAPI;

      apiBase[methodName] = requestHandlerFactory(
        typeInfoORMAPI,
        methodName,
        onRequestStateChange,
      );
    }

    return apiBase as TypeInfoORMServiceAPI;
  }, [typeInfoORMAPI, onRequestStateChange]);

  return {
    state,
    api,
  };
};
