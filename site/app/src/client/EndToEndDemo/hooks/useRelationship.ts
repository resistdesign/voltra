import { useCallback } from "react";
import type { ListRelationshipsConfig } from "../../../../../../src/common/SearchTypes";
import type { TypeInfoORMClient } from "../../../../../../src/app/utils";
import type { BaseItemRelationshipInfo } from "../../../../../../src/common/ItemRelationshipInfoTypes";
import type { RequestLogEntry } from "../logging/demoLogger";

export type LogRequest = <T>(
  methodName: RequestLogEntry["methodName"],
  args: any[],
  request: () => Promise<T>,
) => Promise<T>;

type UseRelationshipArgs = {
  ormClient: TypeInfoORMClient;
  logRequest: LogRequest;
};

export const useRelationship = ({ ormClient, logRequest }: UseRelationshipArgs) => {
  const listRelatedItems = useCallback(
    async (config: ListRelationshipsConfig, fields: string[]) =>
      logRequest("listRelatedItems", [config, fields], () =>
        ormClient.listRelatedItems(config, fields),
      ),
    [logRequest, ormClient],
  );

  const createRelationship = useCallback(
    async (relationship: BaseItemRelationshipInfo) =>
      logRequest("createRelationship", [relationship], () =>
        ormClient.createRelationship(relationship),
      ),
    [logRequest, ormClient],
  );

  const deleteRelationship = useCallback(
    async (relationship: BaseItemRelationshipInfo) =>
      logRequest("deleteRelationship", [relationship], () =>
        ormClient.deleteRelationship(relationship),
      ),
    [logRequest, ormClient],
  );

  return {
    listRelatedItems,
    createRelationship,
    deleteRelationship,
  };
};
