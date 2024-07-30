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
 * The keys for a relationship item.
 * */
export enum DBRelationshipItemKeys {
  fromTypeName = "fromTypeName",
  fromTypePrimaryFieldValue = "fromTypePrimaryFieldValue",
  fromTypeFieldName = "fromTypeFieldName",
  toTypePrimaryFieldValue = "toTypePrimaryFieldValue",
}

/**
 * A new `DBRelationshipItem`.
 * */
export type BaseDBRelationshipItem = Record<DBRelationshipItemKeys, string>;

/**
 * An item containing the information about a relationship between two items.
 * */
export type DBRelationshipItem = BaseDBRelationshipItem & {
  id: string;
};

/**
 * The origination portion of a `DBRelationshipItem`.
 * */
export type DBRelationshipOrigin = Record<
  | DBRelationshipItemKeys.fromTypeName
  | DBRelationshipItemKeys.fromTypeFieldName,
  string
>;

/**
 * The origination portion of a `DBRelationshipItem` for a specific item.
 * */
export type DBRelationshipItemOrigin = DBRelationshipOrigin &
  Record<DBRelationshipItemKeys.fromTypePrimaryFieldValue, string>;

/**
 * The originating item info portion of a `DBRelationshipItem`.
 *
 * Used for relationship originating from a specific item, regardless of field relationship.
 * */
export type DBRelationshipOriginatingItem = Record<
  | DBRelationshipItemKeys.fromTypeName
  | DBRelationshipItemKeys.fromTypePrimaryFieldValue,
  string
>;

/**
 * One of the various types describing a relationship item.
 * */
export type DBRelationshipItemType =
  | BaseDBRelationshipItem
  | DBRelationshipItem
  | DBRelationshipOrigin
  | DBRelationshipItemOrigin;

/**
 * A configuration for listing relationships.
 * */
export type ListRelationshipsConfig = PagingInfo &
  ItemsExistenceInfo & {
    relationshipItemOrigin: DBRelationshipItemOrigin;
  };

/**
 * A driver for a database service that handles relationship items.
 * */
export type DBRelatedItemDriver = DBServiceItemDriver<DBRelationshipItem, "id">;
