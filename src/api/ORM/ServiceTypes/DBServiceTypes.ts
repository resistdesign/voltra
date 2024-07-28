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
 * The type for checking sub-item existence.
 * */
export type ListItemsConfigCheckType = boolean | undefined;

/**
 * The configuration for listing and searching for items.
 * */
export type ListItemsConfig<CheckType extends ListItemsConfigCheckType> = {
  itemsPerPage?: number;
  cursor?: string;
  criteria?: SearchCriteria;
  sortFields?: SortField[];
  checkExistence?: CheckType;
};

/**
 * The return type for listing items.
 * */
export type ListItemReturnType<
  CheckType extends ListItemsConfigCheckType,
  ItemType extends Record<any, any>,
> = CheckType extends true ? boolean : ListItemResults<ItemType>;

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
  listItems: <CheckType extends ListItemsConfigCheckType>(
    config: ListItemsConfig<CheckType>,
  ) => Promise<ListItemReturnType<CheckType, ItemType>>;
};

/**
 * The keys for a relationship item.
 * */
export enum DBRelationshipItemKeys {
  id = "id",
  fromTypeName = "fromTypeName",
  fromTypePrimaryFieldValue = "fromTypePrimaryFieldValue",
  fromTypeFieldName = "fromTypeFieldName",
  toTypeName = "toTypeName",
  toTypePrimaryFieldValue = "toTypePrimaryFieldValue",
}

/**
 * An item containing the information about a relationship between two items.
 * */
export type DBRelationshipItem = Record<DBRelationshipItemKeys, string>;

/**
 * A driver for a database service that handles relationship items.
 * */
export type DBRelatedItemDriver = DBServiceItemDriver<
  DBRelationshipItem,
  DBRelationshipItemKeys.id
>;
