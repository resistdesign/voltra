import { InMemoryItemRelationshipDBDriver } from "./InMemoryItemRelationshipDBDriver";
import { ComparisonOperators, LogicalOperators } from "../../../common/SearchTypes";
import type {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
} from "../../../common/ItemRelationshipInfoTypes";
import { ItemRelationshipInfoIdentifyingKeys } from "../../../common/ItemRelationshipInfoTypes";

const buildDriver = () =>
  new InMemoryItemRelationshipDBDriver({
    tableName: "Relationships",
    uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
  });

const buildRelationship = (
  fromTypeName: string,
  fromTypeFieldName: string,
  fromTypePrimaryFieldValue: string,
  toTypePrimaryFieldValue: string,
): BaseItemRelationshipInfo => ({
  fromTypeName,
  fromTypeFieldName,
  fromTypePrimaryFieldValue,
  toTypePrimaryFieldValue,
});

export const runInMemoryRelationshipDriverScenario = async () => {
  const driver = buildDriver();

  const rel1 = buildRelationship("User", "favoritePost", "user-1", "post-1");
  const rel2 = buildRelationship("User", "favoritePost", "user-1", "post-2");
  const rel3 = buildRelationship("User", "likes", "user-2", "post-3");

  const id1 = await driver.createItem(rel1);
  const id2 = await driver.createItem(rel2);
  const id3 = await driver.createItem(rel3);

  const listFavorites = await driver.listItems({
    itemsPerPage: 10,
    sortFields: [{ field: "toTypePrimaryFieldValue" }],
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "fromTypeName",
          operator: ComparisonOperators.EQUALS,
          value: "User",
        },
        {
          fieldName: "fromTypeFieldName",
          operator: ComparisonOperators.EQUALS,
          value: "favoritePost",
        },
      ],
    },
  });

  const page1 = await driver.listItems({
    itemsPerPage: 1,
    sortFields: [{ field: "toTypePrimaryFieldValue" }],
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "fromTypePrimaryFieldValue",
          operator: ComparisonOperators.EQUALS,
          value: "user-1",
        },
      ],
    },
  });
  const page2 = await driver.listItems({
    itemsPerPage: 1,
    sortFields: [{ field: "toTypePrimaryFieldValue" }],
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "fromTypePrimaryFieldValue",
          operator: ComparisonOperators.EQUALS,
          value: "user-1",
        },
      ],
    },
    cursor: page1.cursor,
  });

  await driver.updateItem(id1, { toTypePrimaryFieldValue: "post-1b" } as Partial<ItemRelationshipInfo>);
  const afterUpdate = await driver.readItem(id1);

  const deleteResult = await driver.deleteItem(id2);
  const afterDelete = await driver.listItems({
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "fromTypeFieldName",
          operator: ComparisonOperators.EQUALS,
          value: "favoritePost",
        },
      ],
    },
  });

  let invalidCursorError: string | undefined;
  try {
    await driver.listItems({ itemsPerPage: 1, cursor: "nope" });
  } catch (error: any) {
    invalidCursorError = error?.message ?? String(error);
  }

  return {
    createdIds: [id1, id2, id3],
    listFavoriteIds: listFavorites.items.map((item) => item.id),
    page1Ids: page1.items.map((item) => item.id),
    page2Ids: page2.items.map((item) => item.id),
    afterUpdate: {
      id: afterUpdate.id,
      toTypePrimaryFieldValue: afterUpdate.toTypePrimaryFieldValue,
    },
    deleteResult,
    remainingFavoriteIds: afterDelete.items.map((item) => item.id),
    invalidCursorError,
  };
};
