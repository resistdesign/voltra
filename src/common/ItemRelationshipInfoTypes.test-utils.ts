import {
  ItemRelationshipInfoIdentifyingKeys,
  ItemRelationshipInfoKeys,
} from "./ItemRelationshipInfoTypes";

const getItemRelationshipInfoTypeScenarioData = () => {
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

export const runItemRelationshipInfoKeysScenario = () =>
  getItemRelationshipInfoTypeScenarioData().infoKeys;

export const runItemRelationshipIdentifyingKeysScenario = () =>
  getItemRelationshipInfoTypeScenarioData().identifyingKeys;

export const runItemRelationshipBaseInfoScenario = () =>
  getItemRelationshipInfoTypeScenarioData().baseInfo;

export const runItemRelationshipInfoWithIdScenario = () =>
  getItemRelationshipInfoTypeScenarioData().infoWithId;

export const runItemRelationshipOriginInfoScenario = () =>
  getItemRelationshipInfoTypeScenarioData().originInfo;
