import {
  DataItemDBDriverConfig,
} from "./common";
import type {
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys,
} from "../../../common/ItemRelationshipInfoTypes";
import { InMemoryDataItemDBDriver } from "./InMemoryDataItemDBDriver";

const buildDefaultRelationshipId = (item: ItemRelationshipInfo): string => {
  const {
    fromTypeName,
    fromTypeFieldName,
    fromTypePrimaryFieldValue,
    toTypePrimaryFieldValue,
  } = item;

  return [
    fromTypeName,
    fromTypeFieldName,
    fromTypePrimaryFieldValue,
    toTypePrimaryFieldValue,
  ]
    .map((value) => String(value))
    .join("|");
};

export type InMemoryItemRelationshipDBDriverConfig = DataItemDBDriverConfig<
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys.id
>;

export class InMemoryItemRelationshipDBDriver extends InMemoryDataItemDBDriver<
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys.id
> {
  constructor(config: InMemoryItemRelationshipDBDriverConfig) {
    const generateUniqueIdentifier =
      config.generateUniqueIdentifier ?? buildDefaultRelationshipId;

    super({
      ...config,
      generateUniqueIdentifier,
    });
  }
}
