import { SearchCriteria } from "../../../common/SearchTypes";
import {
  ItemRelationshipInfo,
  ItemRelationshipOriginItemInfo,
} from "../../../common";

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
