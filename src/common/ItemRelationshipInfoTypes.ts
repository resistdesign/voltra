/**
 * Relationship info types used by ORM and relationship utilities.
 */
import type { ExpandComplexType } from "./HelperTypes";

/**
 * The keys for item relationship info.
 * */
export enum ItemRelationshipInfoKeys {
  /**
   * Relationship origin type name.
   * */
  fromTypeName = "fromTypeName",
  /**
   * Relationship origin field name.
   * */
  fromTypeFieldName = "fromTypeFieldName",
  /**
   * Relationship origin primary field value.
   * */
  fromTypePrimaryFieldValue = "fromTypePrimaryFieldValue",
  /**
   * Relationship destination primary field value.
   * */
  toTypePrimaryFieldValue = "toTypePrimaryFieldValue",
}

/**
 * The identifying keys for item relationship info.
 * */
export enum ItemRelationshipInfoIdentifyingKeys {
  /**
   * Identifier value for a relationship item.
   * */
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
export type ItemRelationshipOriginItemInfo = ExpandComplexType<
  ItemRelationshipOriginInfo &
    Record<ItemRelationshipInfoKeys.fromTypePrimaryFieldValue, string>
>;

/**
 * The destination portion of an `ItemRelationshipInfo` for a specific, related item.
 * */
export type ItemRelationshipDestinationItemInfo = Record<
  ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
  string
>;

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
