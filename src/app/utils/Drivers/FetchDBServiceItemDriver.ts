import { DBServiceItemDriver } from "../../../common/ServiceTypes";

export type FetchDBServiceItemDriverConfig = {
  baseUrl: string;
};

export class FetchDBServiceItemDriver<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> implements DBServiceItemDriver<ItemType, UniquelyIdentifyingFieldName>
{
  constructor(protected config: FetchDBServiceItemDriverConfig) {}

  createItem(
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ): Promise<ItemType[UniquelyIdentifyingFieldName]> {
    throw new Error("Method not implemented.");
  }

  readItem(
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ): Promise<ItemType> {
    throw new Error("Method not implemented.");
  }

  updateItem(updatedItem: Partial<ItemType>): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  deleteItem(
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  listItems(
    config: import("../../../common/SearchTypes").ListItemsConfig,
  ): Promise<
    boolean | import("../../../common/SearchTypes").ListItemsResults<ItemType>
  > {
    throw new Error("Method not implemented.");
  }
}
