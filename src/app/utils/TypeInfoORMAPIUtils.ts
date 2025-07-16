import {
  TypeInfoORMAPI,
  TypeInfoORMServiceError,
} from "../../common/TypeInfoORM";
import { ExpandComplexType } from "../../common/HelperTypes";
import { useCallback, useMemo, useState } from "react";
import { getSimpleId } from "../../common/IdGeneration";

type RequestMethod = (...args: any[]) => Promise<any>;

export type SyncRequestHandler<ArgsType extends any[]> = (
  ...args: ArgsType
) => string;

export type TypeInfoORMServiceAPI = ExpandComplexType<{
  [K in keyof TypeInfoORMAPI]: TypeInfoORMAPI[K] extends (
    ...args: infer A
  ) => Promise<any>
    ? SyncRequestHandler<A>
    : TypeInfoORMAPI[K];
}>;

export type BaseTypeInfoORMAPIRequestState = {
  loading?: boolean;
  data?: any;
  error?: TypeInfoORMServiceError;
};

export type TypeInfoORMAPIRequestState = ExpandComplexType<
  BaseTypeInfoORMAPIRequestState & {
    activeRequests?: string[];
  }
>;

type RequestStateChangeHandler = (
  methodName: keyof TypeInfoORMAPI,
  requestId: string,
  requestState: BaseTypeInfoORMAPIRequestState,
) => void;

export type TypeInfoORMAPIState = Partial<
  Record<keyof TypeInfoORMAPI, TypeInfoORMAPIRequestState>
>;

export type TypeInfoORMAPIController = {
  state: TypeInfoORMAPIState;
  api: TypeInfoORMServiceAPI;
};

const handleRequest = async (
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

const requestHandlerFactory =
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
            loading: prevLoading,
            data: prevData,
            error: prevError,
          } = {},
          ...prevState
        }) => {
          const newActiveRequests = loading
            ? [...prevActiveRequests, requestId]
            : prevActiveRequests.filter((id) => id !== requestId);

          return {
            ...prevState,
            [methodName]: {
              activeRequests: newActiveRequests,
              loading: newActiveRequests.length > 0,
              data: data ?? prevData,
              error: error ?? prevError,
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
