/**
 * The keys for item relationship info.
 * */
export enum ItemRelationshipInfoKeys {
  fromTypeName = "fromTypeName",
  fromTypePrimaryFieldValue = "fromTypePrimaryFieldValue",
  fromTypeFieldName = "fromTypeFieldName",
  toTypePrimaryFieldValue = "toTypePrimaryFieldValue",
}

/**
 * The identifying keys for item relationship info.
 * */
export enum ItemRelationshipInfoIdentifyingKeys {
  id = "id",
}

/**
 * The basis for an `ItemRelationshipInfo` without an assigned identifier.
 * */
export type BaseItemRelationshipInfo = Record<ItemRelationshipInfoKeys, string>;

/**
 * An item containing the information about a relationship between two items.
 * */
export type ItemRelationshipInfo = BaseItemRelationshipInfo &
  Record<ItemRelationshipInfoIdentifyingKeys, string>;

/**
 * The origination portion of an `ItemRelationshipInfo`.
 * */
export type ItemRelationshipOriginInfo = Record<
  | ItemRelationshipInfoKeys.fromTypeName
  | ItemRelationshipInfoKeys.fromTypeFieldName,
  string
>;

/**
 * The origination portion of an `ItemRelationshipInfo` for a specific item and field relationship.
 * */
export type ItemRelationshipOriginItemInfo = ItemRelationshipOriginInfo &
  Record<ItemRelationshipInfoKeys.fromTypePrimaryFieldValue, string>;

/**
 * The originating item info portion of an `ItemRelationshipInfo`.
 *
 * Used for relationship originating from a specific item, regardless of field relationship.
 * */
export type ItemRelationshipOriginatingItemInfo = Record<
  | ItemRelationshipInfoKeys.fromTypeName
  | ItemRelationshipInfoKeys.fromTypePrimaryFieldValue,
  string
>;

/**
 * One of the various types describing an item relationship.
 * */
export type ItemRelationshipInfoType =
  | BaseItemRelationshipInfo
  | ItemRelationshipInfo
  | ItemRelationshipOriginInfo
  | ItemRelationshipOriginItemInfo;
