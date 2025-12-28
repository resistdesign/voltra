import { RelationalInMemoryBackend } from "../../Indexing/rel/inMemory";
import { IndexingRelationshipDriver } from "./IndexingRelationshipDriver";
import type { BaseItemRelationshipInfo } from "../../../common/ItemRelationshipInfoTypes";

const buildDriver = (): IndexingRelationshipDriver =>
  new IndexingRelationshipDriver({
    backend: new RelationalInMemoryBackend(),
    relationNameFor: (fromTypeName, fromTypeFieldName) =>
      `${fromTypeName}.${fromTypeFieldName}`,
  });

export const runIndexingRelationshipScenario = async () => {
  const driver = buildDriver();
  const base: BaseItemRelationshipInfo = {
    fromTypeName: "User",
    fromTypeFieldName: "favoritePost",
    fromTypePrimaryFieldValue: "user-1",
    toTypePrimaryFieldValue: "post-1",
  };
  const toTypeName = "Post";

  await driver.createRelationship(base, toTypeName, true);
  const afterFirst = await driver.listRelationships(
    {
      relationshipItemOrigin: {
        fromTypeName: base.fromTypeName,
        fromTypeFieldName: base.fromTypeFieldName,
        fromTypePrimaryFieldValue: base.fromTypePrimaryFieldValue,
      },
    },
    toTypeName,
  );

  await driver.createRelationship(
    {
      ...base,
      toTypePrimaryFieldValue: "post-2",
    },
    toTypeName,
    true,
  );
  const afterSecond = await driver.listRelationships(
    {
      relationshipItemOrigin: {
        fromTypeName: base.fromTypeName,
        fromTypeFieldName: base.fromTypeFieldName,
        fromTypePrimaryFieldValue: base.fromTypePrimaryFieldValue,
      },
    },
    toTypeName,
  );

  await driver.deleteRelationship(
    {
      ...base,
      toTypePrimaryFieldValue: "post-2",
    },
    toTypeName,
  );
  const afterDelete = await driver.listRelationships(
    {
      relationshipItemOrigin: {
        fromTypeName: base.fromTypeName,
        fromTypeFieldName: base.fromTypeFieldName,
        fromTypePrimaryFieldValue: base.fromTypePrimaryFieldValue,
      },
    },
    toTypeName,
  );

  return {
    afterFirst: afterFirst.items.map((item) => item.toTypePrimaryFieldValue),
    afterSecond: afterSecond.items.map((item) => item.toTypePrimaryFieldValue),
    afterDelete: afterDelete.items.map((item) => item.toTypePrimaryFieldValue),
  };
};
