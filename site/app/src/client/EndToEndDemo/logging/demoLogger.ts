import { useCallback, useState } from "react";
import { TypeInfoORMAPIRoutePaths } from "../../../../../../src/common/TypeInfoORM";
import type { TypeInfoORMClientAPI } from "../../../../../../src/common/TypeInfoORM";
import { getSimpleId } from "../../../../../../src/common/IdGeneration";

export type RequestLogEntry = {
  id: string;
  methodName: keyof TypeInfoORMClientAPI;
  path: TypeInfoORMAPIRoutePaths;
  args: any[];
  status: "pending" | "success" | "error";
  response?: any;
  error?: any;
  timestamp: string;
};

const ORM_METHOD_PATHS: Record<
  keyof TypeInfoORMClientAPI,
  TypeInfoORMAPIRoutePaths
> =
  {
    create: TypeInfoORMAPIRoutePaths.CREATE,
    read: TypeInfoORMAPIRoutePaths.READ,
    update: TypeInfoORMAPIRoutePaths.UPDATE,
    delete: TypeInfoORMAPIRoutePaths.DELETE,
    list: TypeInfoORMAPIRoutePaths.LIST,
    createRelationship: TypeInfoORMAPIRoutePaths.CREATE_RELATIONSHIP,
    deleteRelationship: TypeInfoORMAPIRoutePaths.DELETE_RELATIONSHIP,
    listRelationships: TypeInfoORMAPIRoutePaths.LIST_RELATIONSHIPS,
    listRelatedItems: TypeInfoORMAPIRoutePaths.LIST_RELATED_ITEMS,
  };

export const useDemoLogger = () => {
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([]);

  const logRequest = useCallback(
    async <T,>(
      methodName: keyof TypeInfoORMClientAPI,
      args: any[],
      request: () => Promise<T>,
    ): Promise<T> => {
      const id = getSimpleId();
      const entry: RequestLogEntry = {
        id,
        methodName,
        path: ORM_METHOD_PATHS[methodName],
        args,
        status: "pending",
        timestamp: new Date().toISOString(),
      };

      setRequestLog((prev) => [entry, ...prev]);

      try {
        const response = await request();

        setRequestLog((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "success",
                  response,
                }
              : item,
          ),
        );

        return response;
      } catch (error) {
        setRequestLog((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "error",
                  error,
                }
              : item,
          ),
        );
        throw error;
      }
    },
    [],
  );

  return {
    requestLog,
    logRequest,
    clearLog: () => setRequestLog([]),
  };
};
