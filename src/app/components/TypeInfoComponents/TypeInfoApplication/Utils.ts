import { ServiceConfig, TypeInfoORMClient } from "../../../utils";
import { useMemo, useState } from "react";
import { ItemRelationshipInfoStructure, TypeInfoDataStructure } from "../Types";

export type TypeInfoDataManager = {
  dataStructure: TypeInfoDataStructure;
  relationshipStructure: ItemRelationshipInfoStructure;
};

export const useTypeInfoORMClient = (
  config: ServiceConfig,
): TypeInfoORMClient => {
  const client = useMemo<TypeInfoORMClient>(
    () => new TypeInfoORMClient(config),
    [config],
  );

  return client;
};

export const useTypeInfoDataManager = (config: ServiceConfig) => {
  const [value, setValue] = useState<TypeInfoDataStructure>({});
  const [relationshipInfo, setRelationshipInfo] =
    useState<ItemRelationshipInfoStructure>({});
  const client = useTypeInfoORMClient(config);
  // TODO: Cache???
  // TODO: What to return???
};
