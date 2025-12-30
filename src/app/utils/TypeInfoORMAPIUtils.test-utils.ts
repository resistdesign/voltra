import type { TypeInfoORMAPI } from "../../common/TypeInfoORM";
import { handleRequest, requestHandlerFactory } from "./TypeInfoORMAPIUtils";

type RequestStateSummary = {
  methodName: string;
  requestId: string;
  loading: boolean;
  data: any;
  error: any;
};

const buildApi = (): TypeInfoORMAPI =>
  ({
    createRelationship: async () => true,
    deleteRelationship: async () => ({ success: true, remainingItemsExist: false }),
    listRelationships: async () => ({ items: [], cursor: undefined }),
    listRelatedItems: async () => ({ items: [], cursor: undefined }),
    create: async () => "created",
    read: async (...args: any[]) => ({ ok: true, args }),
    update: async () => {
      throw new Error("INVALID_OPERATION");
    },
    delete: async () => true,
    list: async () => ({ items: [], cursor: undefined }),
  }) as TypeInfoORMAPI;

export const runTypeInfoORMAPIUtilsScenario = async () => {
  const api = buildApi();
  const successCalls: RequestStateSummary[] = [];
  const errorCalls: RequestStateSummary[] = [];

  await handleRequest("req-1", ["a"], api, "read", (methodName, requestId, state) => {
    successCalls.push({
      methodName: String(methodName),
      requestId,
      loading: !!state.loading,
      data: state.data ?? null,
      error: state.error ?? null,
    });
  });

  await handleRequest("req-2", [], api, "update", (methodName, requestId, state) => {
    errorCalls.push({
      methodName: String(methodName),
      requestId,
      loading: !!state.loading,
      data: state.data ?? null,
      error: state.error ?? null,
    });
  });

  const factoryCalls: RequestStateSummary[] = [];
  const handler = requestHandlerFactory(api, "read", (methodName, requestId, state) => {
    factoryCalls.push({
      methodName: String(methodName),
      requestId,
      loading: !!state.loading,
      data: state.data ?? null,
      error: state.error ?? null,
    });
  });
  const requestId = handler("factory");
  await new Promise((resolve) => setTimeout(resolve, 0));

  return {
    successCalls,
    errorCalls,
    requestIdIsString: typeof requestId === "string" && requestId.length > 0,
    factoryCallsCount: factoryCalls.length,
    factoryCallMatchesId: factoryCalls.every((call) => call.requestId === requestId),
    factoryCallData: factoryCalls.map((call) => call.data),
  };
};
