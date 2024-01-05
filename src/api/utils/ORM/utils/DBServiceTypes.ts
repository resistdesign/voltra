import { Criteria } from "./SearchCriteriaTypes";

export type AsyncReturnValue<T> = Promise<T> | T;

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
  criteria?: Criteria;
};

export type SearchItemsConfig = ListItemsConfig & {
  criteria?: Criteria;
  sortFields?: SortField[];
};

export type PartialItemTypeWithUniquelyIdentifyingFieldName<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType
> = Partial<ItemType> & Pick<ItemType, UniquelyIdentifyingFieldName>;

export type BooleanOrUndefined = boolean | undefined;

export type PartialOrFullItemType<
  PatchType extends BooleanOrUndefined,
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType
> = PatchType extends true
  ? PartialItemTypeWithUniquelyIdentifyingFieldName<
      ItemType,
      UniquelyIdentifyingFieldName
    >
  : ItemType;

export type UpdateItemOperation<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType
> = (
  updatedItem: PartialOrFullItemType<
    typeof patch,
    ItemType,
    UniquelyIdentifyingFieldName
  >,
  patch?: BooleanOrUndefined
) => AsyncReturnValue<ItemType>;

export type DBServiceItemDriver<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType
> = {
  createItem: (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>
  ) => AsyncReturnValue<ItemType>;
  readItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName]
  ) => AsyncReturnValue<ItemType>;
  updateItem: UpdateItemOperation<ItemType, UniquelyIdentifyingFieldName>;
  deleteItem: (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName]
  ) => AsyncReturnValue<ItemType>;
  // TODO: Needs to support Item Results OR Boolean Existence for a particular query.
  listItems: (
    config: ListItemsConfig
  ) => AsyncReturnValue<ListItemResults<ItemType>>;
};
