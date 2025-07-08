import {
  TypeInfoORMAPI,
  TypeInfoORMServiceError,
} from "../../common/TypeInfoORM";
import { ExpandComplexType } from "../../common/HelperTypes";
import { useCallback, useMemo, useState } from "react";
import { getSimpleId } from "../../common/IdGeneration";

type RequestMethod = (...args: any[]) => Promise<any>;

type RequestStateChangeHandler = (
  requestId: string,
  requestState: TypeInfoORMAPIRequestState,
) => void;

export type SyncRequestHandler<ArgsType extends any[]> = (
  ...args: ArgsType
) => string;

export type ControllerAPI = ExpandComplexType<{
  [K in keyof TypeInfoORMAPI]: TypeInfoORMAPI[K] extends (
    ...args: infer A
  ) => Promise<any>
    ? SyncRequestHandler<A>
    : TypeInfoORMAPI[K];
}>;

export type TypeInfoORMAPIRequestState = {
  loading?: boolean;
  data?: any;
  error?: TypeInfoORMServiceError;
};

export type TypeInfoORMAPIState = {
  [requestId: string]: TypeInfoORMAPIRequestState;
};

export type TypeInfoORMAPIController = {
  state: TypeInfoORMAPIState;
  api: ControllerAPI;
};

const handleRequest = async (
  requestId: string,
  args: any[],
  typeInfoORMAPI: TypeInfoORMAPI,
  methodName: keyof TypeInfoORMAPI,
  onRequestStateChange: RequestStateChangeHandler,
): Promise<void> => {
  onRequestStateChange(requestId, { loading: true });

  try {
    const requestMethod: RequestMethod = typeInfoORMAPI[methodName];
    const result = await requestMethod(...args);

    onRequestStateChange(requestId, { loading: false, data: result });
  } catch (error) {
    onRequestStateChange(requestId, {
      loading: false,
      error: error as TypeInfoORMServiceError,
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
    (requestId, requestState) => {
      setState((prevState) => ({
        ...prevState,
        [requestId]: requestState,
      }));
    },
    [],
  );
  const api = useMemo<ControllerAPI>(() => {
    const apiBase: Partial<ControllerAPI> = {};

    for (const aM in typeInfoORMAPI) {
      const methodName = aM as keyof TypeInfoORMAPI;

      apiBase[methodName] = requestHandlerFactory(
        typeInfoORMAPI,
        methodName,
        onRequestStateChange,
      );
    }

    return apiBase as ControllerAPI;
  }, [typeInfoORMAPI, onRequestStateChange]);

  return {
    state,
    api,
  };
};
