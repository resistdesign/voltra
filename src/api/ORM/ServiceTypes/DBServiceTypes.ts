import { SearchCriteria } from "../../../common/SearchTypes";

export type ListItemResults<ItemType extends Record<any, any>> = {
  cursor?: string;
  items: ItemType[];
};

export type SortField = {
  field?: string;
  reverse?: boolean;
};

/**
 * The information for paging through a list of items.
 * */
export type PagingInfo = {
  itemsPerPage?: number;
  cursor?: string;
};

/**
 * The information for checking the existence of items.
 * */
export type ItemsExistenceInfo = {
  checkExistence?: boolean | undefined;
};

/**
 * The configuration for listing and searching for items.
 * */
export type ListItemsConfig = PagingInfo &
  ItemsExistenceInfo & {
    criteria?: SearchCriteria;
    sortFields?: SortField[];
  };

/**
 * A driver for a database service.
 * */
export type DBServiceItemDriver<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  createItem: (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ) => Promise<ItemType[UniquelyIdentifyingFieldName]>;
  readItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<ItemType>;
  updateItem: (updatedItem: Partial<ItemType>) => Promise<boolean>;
  deleteItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<boolean>;
  listItems: (
    config: ListItemsConfig,
  ) => Promise<boolean | ListItemResults<ItemType>>;
};

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

/**
 * A configuration for listing relationships.
 * */
export type ListRelationshipsConfig = PagingInfo &
  ItemsExistenceInfo & {
    relationshipItemOrigin: ItemRelationshipOriginItemInfo;
  };

/**
 * A driver for a database service that handles relationship items.
 * */
export type DBRelatedItemDriver = DBServiceItemDriver<
  ItemRelationshipInfo,
  "id"
>;
