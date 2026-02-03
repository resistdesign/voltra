import { useCallback } from "react";
import type { ListItemsConfig, ListItemsResults } from "../../../../../../src/common/SearchTypes";
import type { TypeInfoORMClient } from "../../../../../../src/app/utils";
import type { RequestLogEntry } from "../logging/demoLogger";

export type LogRequest = <T>(
  methodName: RequestLogEntry["methodName"],
  args: any[],
  request: () => Promise<T>,
) => Promise<T>;

type UseCarsArgs = {
  ormClient: TypeInfoORMClient;
  logRequest: LogRequest;
};

export const useCars = ({ ormClient, logRequest }: UseCarsArgs) => {
  const listCars = useCallback(
    async (config: ListItemsConfig) => {
      return (await logRequest("list", ["Car", config], () =>
        ormClient.list("Car", config),
      )) as ListItemsResults<any>;
    },
    [logRequest, ormClient],
  );

  const readCar = useCallback(
    async (carId: string) =>
      logRequest("read", ["Car", carId], () => ormClient.read("Car", carId)),
    [logRequest, ormClient],
  );

  const createCar = useCallback(
    async (values: any) =>
      logRequest("create", ["Car", values], () =>
        ormClient.create("Car", values),
      ),
    [logRequest, ormClient],
  );

  const updateCar = useCallback(
    async (payload: any) =>
      logRequest("update", ["Car", payload], () =>
        ormClient.update("Car", payload),
      ),
    [logRequest, ormClient],
  );

  const deleteCar = useCallback(
    async (carId: string) =>
      logRequest("delete", ["Car", carId], () =>
        ormClient.delete("Car", carId),
      ),
    [logRequest, ormClient],
  );

  return {
    listCars,
    readCar,
    createCar,
    updateCar,
    deleteCar,
  };
};
