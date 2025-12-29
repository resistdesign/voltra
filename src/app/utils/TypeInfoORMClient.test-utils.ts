import { TypeInfoORMClient } from "./TypeInfoORMClient";
import type { ServiceConfig } from "./Service";
import type { TypeInfoDataItem } from "../../common/TypeParsing/TypeInfo";
import type { ListItemsConfig } from "../../common/SearchTypes";
import type { BaseItemRelationshipInfo } from "../../common/ItemRelationshipInfoTypes";

export const runTypeInfoORMClientScenario = async () => {
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

  const created = await client.create("Book", { title: "Alpha" } as TypeInfoDataItem);
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
