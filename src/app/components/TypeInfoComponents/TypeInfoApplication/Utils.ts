import { ServiceConfig, TypeInfoORMClient } from "../../../utils";
import { useMemo, useState } from "react";
import { ItemRelationshipInfoStructure, TypeInfoDataStructure } from "../Types";

export const useTypeInfoORMClient = (config: ServiceConfig) => {
  const client = useMemo<TypeInfoORMClient>(
    () => new TypeInfoORMClient(config),
    [config],
  );

  return client;
};

export const useTypeInfoDataManager = (config: ServiceConfig) => {
  const [value, setValue] = useState<TypeInfoDataStructure>({});
  const client = useTypeInfoORMClient(config);
  // TODO: Cache???
  // TODO: What to return???
};

export const useTypeInfoRelationshipManager = (config: ServiceConfig) => {
  const [relationshipInfo, setRelationshipInfo] =
    useState<ItemRelationshipInfoStructure>({});
  const client = useTypeInfoORMClient(config);
  // TODO: Cache???
  // TODO: What to return???
};
