/**
 * The keys for item relationship info.
 * */
export enum ItemRelationshipInfoKeys {
  fromTypeName = "fromTypeName",
  fromTypeFieldName = "fromTypeFieldName",
  fromTypePrimaryFieldValue = "fromTypePrimaryFieldValue",
  toTypePrimaryFieldValue = "toTypePrimaryFieldValue",
}

/**
 * The basis for an `ItemRelationshipInfo` without an assigned identifier.
 * */
export type BaseItemRelationshipInfo = Record<ItemRelationshipInfoKeys, string>;

/**
 * An item containing the information about a relationship between two items.
 * */
export type ItemRelationshipInfo = BaseItemRelationshipInfo & {
  id: string;
};

/**
 * The origination portion of an `ItemRelationshipInfo`.
 * */
export type ItemRelationshipOriginInfo = Record<
  | ItemRelationshipInfoKeys.fromTypeName
  | ItemRelationshipInfoKeys.fromTypeFieldName,
  string
>;

/**
 * The origination portion of an `ItemRelationshipInfo` for a specific item.
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
