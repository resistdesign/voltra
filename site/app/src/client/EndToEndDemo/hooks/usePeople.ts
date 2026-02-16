import { useCallback } from "react";
import type { ListItemsConfig, ListItemsResults } from "../../../../../../src/common/SearchTypes";
import type { TypeInfoORMClient } from "../../../../../../src/app/utils";
import type { RequestLogEntry } from "../logging/demoLogger";

export type LogRequest = <T>(
  methodName: RequestLogEntry["methodName"],
  args: any[],
  request: () => Promise<T>,
) => Promise<T>;

type UsePeopleArgs = {
  ormClient: TypeInfoORMClient;
  logRequest: LogRequest;
};

export const usePeople = ({ ormClient, logRequest }: UsePeopleArgs) => {
  const listPeople = useCallback(
    async (config: ListItemsConfig) => {
      return (await logRequest("list", ["Person", config], () =>
        ormClient.list("Person", config),
      )) as ListItemsResults<any>;
    },
    [logRequest, ormClient],
  );

  const readPerson = useCallback(
    async (personId: string) =>
      logRequest("read", ["Person", personId], () =>
        ormClient.read("Person", personId),
      ),
    [logRequest, ormClient],
  );

  const createPerson = useCallback(
    async (values: any) =>
      logRequest("create", ["Person", values], () =>
        ormClient.create("Person", values),
      ),
    [logRequest, ormClient],
  );

  const updatePerson = useCallback(
    async (payload: any) =>
      logRequest("update", ["Person", payload], () =>
        ormClient.update("Person", payload),
      ),
    [logRequest, ormClient],
  );

  const deletePerson = useCallback(
    async (personId: string) =>
      logRequest("delete", ["Person", personId], () =>
        ormClient.delete("Person", personId),
      ),
    [logRequest, ormClient],
  );

  return {
    listPeople,
    readPerson,
    createPerson,
    updatePerson,
    deletePerson,
  };
};
