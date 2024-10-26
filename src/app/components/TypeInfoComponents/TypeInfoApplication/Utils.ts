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
  const [dataStructure, setDataStructure] = useState<TypeInfoDataStructure>({});
  const [relationshipStructure, setRelationshipStructure] =
    useState<ItemRelationshipInfoStructure>({});
  const client = useTypeInfoORMClient(config);
  const typeInfoDataManager = useMemo<TypeInfoDataManager>(() => {
    return {
      dataStructure,
      relationshipStructure,
    };
  }, [dataStructure, relationshipStructure]);

  // TODO: Cache???
  // TODO: What to return???
  // TODO: Controls???
  return typeInfoDataManager;
};
