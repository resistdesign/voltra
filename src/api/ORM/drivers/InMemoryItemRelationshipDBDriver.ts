import { DataItemDBDriverConfig } from "./common/Types";
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

/**
 * Configuration for the in-memory relationship driver.
 */
export type InMemoryItemRelationshipDBDriverConfig = DataItemDBDriverConfig<
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys.id
>;

/**
 * In-memory relationship driver using DataItem storage.
 */
export class InMemoryItemRelationshipDBDriver extends InMemoryDataItemDBDriver<
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys.id
> {
  /**
   * @param config Driver configuration for relationship items.
   */
  constructor(config: InMemoryItemRelationshipDBDriverConfig) {
    const generateUniqueIdentifier =
      config.generateUniqueIdentifier ?? buildDefaultRelationshipId;

    super({
      ...config,
      generateUniqueIdentifier,
    });
  }
}
