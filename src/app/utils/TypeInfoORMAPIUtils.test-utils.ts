import type { TypeInfoORMClientAPI } from "../../common/TypeInfoORM";
import type { TypeInfoORMServiceAPI } from "./TypeInfoORMAPIUtils";
import { handleRequest, requestHandlerFactory } from "./TypeInfoORMAPIUtils";

type RequestStateSummary = {
  methodName: string;
  requestId: string;
  loading: boolean;
  data: any;
  error: any;
};

const buildApi = (): TypeInfoORMClientAPI =>
  ({
    createRelationship: async () => true,
    deleteRelationship: async () => ({
      success: true,
      remainingItemsExist: false,
    }),
    listRelationships: async () => ({ items: [], cursor: undefined }),
    listRelatedItems: async () => ({ items: [], cursor: undefined }),
    create: async () => "created",
    read: async (...args: any[]) => ({ ok: true, args }),
    update: async () => {
      throw new Error("INVALID_OPERATION");
    },
    delete: async () => true,
    list: async () => ({ items: [], cursor: undefined }),
  }) as TypeInfoORMClientAPI;

const assertWrappedAPIRejectsContext = (api: TypeInfoORMServiceAPI) => {
  // @ts-expect-error Wrapped client API must not accept server context args.
  api.read("book-type", "book-1", undefined, { accessingRoleId: "role-1" });
  // @ts-expect-error Wrapped client API must not accept server context args.
  api.listRelationships({ relationshipItemOrigin: {} as any }, { accessingRoleId: "role-1" });
};

const runTypeInfoORMAPIUtilsScenario = async () => {
  const api = buildApi();
  const successCalls: RequestStateSummary[] = [];
  const errorCalls: RequestStateSummary[] = [];

  await handleRequest(
    "req-1",
    ["a"],
    api,
    "read",
    (methodName, requestId, state) => {
      successCalls.push({
        methodName: String(methodName),
        requestId,
        loading: !!state.loading,
        data: state.data ?? null,
        error: state.error ?? null,
      });
    },
  );

  await handleRequest(
    "req-2",
    [],
    api,
    "update",
    (methodName, requestId, state) => {
      errorCalls.push({
        methodName: String(methodName),
        requestId,
        loading: !!state.loading,
        data: state.data ?? null,
        error: state.error ?? null,
      });
    },
  );

  const factoryCalls: RequestStateSummary[] = [];
  const handler = requestHandlerFactory(
    api,
    "read",
    (methodName, requestId, state) => {
      factoryCalls.push({
        methodName: String(methodName),
        requestId,
        loading: !!state.loading,
        data: state.data ?? null,
        error: state.error ?? null,
      });
    },
  );
  const requestId = handler("factory");
  await new Promise((resolve) => setTimeout(resolve, 0));

  return {
    successCalls,
    errorCalls,
    requestIdIsString: typeof requestId === "string" && requestId.length > 0,
    factoryCallsCount: factoryCalls.length,
    factoryCallMatchesId: factoryCalls.every(
      (call) => call.requestId === requestId,
    ),
    factoryCallData: factoryCalls.map((call) => call.data),
  };
};

export const runTypeInfoORMAPIUtilsSuccessCallsScenario = async () =>
  (await runTypeInfoORMAPIUtilsScenario()).successCalls;

export const runTypeInfoORMAPIUtilsErrorCallsScenario = async () =>
  (await runTypeInfoORMAPIUtilsScenario()).errorCalls;

export const runTypeInfoORMAPIUtilsRequestIdIsStringScenario = async () =>
  (await runTypeInfoORMAPIUtilsScenario()).requestIdIsString;

export const runTypeInfoORMAPIUtilsFactoryCallsCountScenario = async () =>
  (await runTypeInfoORMAPIUtilsScenario()).factoryCallsCount;

export const runTypeInfoORMAPIUtilsFactoryCallMatchesIdScenario = async () =>
  (await runTypeInfoORMAPIUtilsScenario()).factoryCallMatchesId;

export const runTypeInfoORMAPIUtilsFactoryCallDataScenario = async () =>
  (await runTypeInfoORMAPIUtilsScenario()).factoryCallData;
