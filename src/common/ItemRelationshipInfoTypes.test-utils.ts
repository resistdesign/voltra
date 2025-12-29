import {
  ItemRelationshipInfoIdentifyingKeys,
  ItemRelationshipInfoKeys,
} from "./ItemRelationshipInfoTypes";

export const runItemRelationshipInfoTypesScenario = () => {
  const infoKeys = Object.values(ItemRelationshipInfoKeys);
  const identifyingKeys = Object.values(ItemRelationshipInfoIdentifyingKeys);

  const baseInfo = {
    [ItemRelationshipInfoKeys.fromTypeName]: "Book",
    [ItemRelationshipInfoKeys.fromTypeFieldName]: "author",
    [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]: "book-1",
    [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: "person-1",
  };

  const infoWithId = {
    ...baseInfo,
    [ItemRelationshipInfoIdentifyingKeys.id]: "rel-1",
  };

  const originInfo = {
    [ItemRelationshipInfoKeys.fromTypeName]: "Book",
    [ItemRelationshipInfoKeys.fromTypeFieldName]: "author",
  };

  return {
    infoKeys,
    identifyingKeys,
    baseInfo,
    infoWithId,
    originInfo,
  };
};
