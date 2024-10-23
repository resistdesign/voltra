import { ServiceConfig, TypeInfoORMClient } from "../../../utils";
import { useMemo } from "react";

export const useTypeInfoORMClient = (config: ServiceConfig) => {
  const client = useMemo<TypeInfoORMClient>(
    () => new TypeInfoORMClient(config),
    [config],
  );

  return client;
};

export const useTypeInfoDataManager = () => {};

export const useTypeInfoRelationshipManager = () => {};
