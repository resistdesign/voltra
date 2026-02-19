import { TypeInfoORMClient } from "./TypeInfoORMClient";
import type { ServiceConfig } from "./Service";
import type { TypeInfoDataItem } from "../../common/TypeParsing/TypeInfo";
import type { ListItemsConfig } from "../../common/SearchTypes";
import type { BaseItemRelationshipInfo } from "../../common/ItemRelationshipInfoTypes";
import type { TypeInfoORMClientAPI } from "../../common/TypeInfoORM";

const assertTypeInfoORMClientAPIRejectsContext = (
  clientAPI: TypeInfoORMClientAPI,
) => {
  // @ts-expect-error Client API must not accept server context arguments.
  clientAPI.read("Book", "book-1", undefined, { accessingRoleId: "role-1" });
  // @ts-expect-error Client API must not accept server context arguments.
  clientAPI.update("Book", { id: "book-1", title: "Beta" }, {
    accessingRoleId: "role-1",
  });
  // @ts-expect-error Client API must not accept server context arguments.
  clientAPI.createRelationship({} as BaseItemRelationshipInfo, { accessingRoleId: "role-1" });
};

const runTypeInfoORMClientScenario = async () => {
  const calls: Array<{ path: string; args: any[] }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (_input, init) => {
    const parsed = JSON.parse((init?.body as string) ?? "[]");
    const path = String(_input).split("/").pop() ?? "";
    calls.push({ path, args: parsed });

    return {
      ok: true,
      json: async () => ({ ok: true, path, args: parsed }),
    } as Response;
  };

  const config: ServiceConfig = {
    protocol: "https",
    domain: "example.com",
    basePath: "api",
  };
  const client = new TypeInfoORMClient(config);

  const created = await client.create("Book", {
    title: "Alpha",
  } as TypeInfoDataItem);
  const read = await client.read("Book", "book-1");
  const updated = await client.update("Book", { id: "book-1", title: "Beta" });
  const deleted = await client.delete("Book", "book-1");

  const listConfig: ListItemsConfig = { itemsPerPage: 5 };
  const list = await client.list("Book", listConfig, ["id"]);

  const relationship: BaseItemRelationshipInfo = {
    fromTypeName: "Author",
    fromTypeFieldName: "books",
    fromTypePrimaryFieldValue: "author-1",
    toTypePrimaryFieldValue: "book-1",
  };

  const relCreated = await client.createRelationship(relationship);
  const relDeleted = await client.deleteRelationship(relationship);
  const relList = await client.listRelationships({
    relationshipItemOrigin: {
      fromTypeName: "Author",
      fromTypeFieldName: "books",
      fromTypePrimaryFieldValue: "author-1",
    },
  });
  const relatedItems = await client.listRelatedItems(
    {
      relationshipItemOrigin: {
        fromTypeName: "Author",
        fromTypeFieldName: "books",
        fromTypePrimaryFieldValue: "author-1",
      },
    },
    ["title"],
  );

  globalThis.fetch = originalFetch;

  return {
    calls,
    created,
    read,
    updated,
    deleted,
    list,
    relCreated,
    relDeleted,
    relList,
    relatedItems,
  };
};

export const runTypeInfoORMClientCallsScenario = async () =>
  (await runTypeInfoORMClientScenario()).calls;

export const runTypeInfoORMClientCreatedScenario = async () =>
  (await runTypeInfoORMClientScenario()).created;

export const runTypeInfoORMClientReadScenario = async () =>
  (await runTypeInfoORMClientScenario()).read;

export const runTypeInfoORMClientUpdatedScenario = async () =>
  (await runTypeInfoORMClientScenario()).updated;

export const runTypeInfoORMClientDeletedScenario = async () =>
  (await runTypeInfoORMClientScenario()).deleted;

export const runTypeInfoORMClientListScenario = async () =>
  (await runTypeInfoORMClientScenario()).list;

export const runTypeInfoORMClientRelCreatedScenario = async () =>
  (await runTypeInfoORMClientScenario()).relCreated;

export const runTypeInfoORMClientRelDeletedScenario = async () =>
  (await runTypeInfoORMClientScenario()).relDeleted;

export const runTypeInfoORMClientRelListScenario = async () =>
  (await runTypeInfoORMClientScenario()).relList;

export const runTypeInfoORMClientRelatedItemsScenario = async () =>
  (await runTypeInfoORMClientScenario()).relatedItems;
