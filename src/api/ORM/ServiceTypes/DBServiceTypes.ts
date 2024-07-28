import { SearchCriteria } from "../../../common/SearchTypes";

export type ListItemResults<ItemType extends Record<any, any>> = {
  cursor?: string;
  items: ItemType[];
};

export type SortField = {
  field?: string;
  reverse?: boolean;
};

export type ListItemsConfig = {
  itemsPerPage?: number;
  cursor?: string;
  criteria?: SearchCriteria;
  // TODO: Use these maybe!?
  sortFields?: SortField[];
  checkExistence?: boolean;
};

export type PartialItemTypeWithUniquelyIdentifyingFieldName<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = Partial<ItemType> & Pick<ItemType, UniquelyIdentifyingFieldName>;

export type BooleanOrUndefined = boolean | undefined;

export type PartialOrFullItemType<
  PatchType extends BooleanOrUndefined,
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = PatchType extends true
  ? PartialItemTypeWithUniquelyIdentifyingFieldName<
      ItemType,
      UniquelyIdentifyingFieldName
    >
  : ItemType;

export type UpdateItemOperation<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = (
  updatedItem: PartialOrFullItemType<
    typeof patch,
    ItemType,
    UniquelyIdentifyingFieldName
  >,
  patch?: BooleanOrUndefined,
) => Promise<ItemType>;

/**
 * A driver for a database service.
 * */
export type DBServiceItemDriver<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  createItem: (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ) => Promise<ItemType>;
  readItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<ItemType>;
  updateItem: UpdateItemOperation<ItemType, UniquelyIdentifyingFieldName>;
  deleteItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ) => Promise<ItemType>;
  // TODO: Needs to support Item Results OR Boolean Existence for a particular query.
  listItems: (
    config: ListItemsConfig,
  ) => Promise<ListItemResults<ItemType> | boolean>;
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
