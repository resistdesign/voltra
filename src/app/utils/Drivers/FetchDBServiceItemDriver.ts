import { DBServiceItemDriver } from "../../../common/ServiceTypes";
import { ListItemsConfig, ListItemsResults } from "../../../common";

export type FetchDBServiceItemDriverConfig = {
  baseUrl: string;
  authorization?: string;
};

export class FetchDBServiceItemDriver<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> implements DBServiceItemDriver<ItemType, UniquelyIdentifyingFieldName>
{
  constructor(protected config: FetchDBServiceItemDriverConfig) {}

  protected makeRequest = async (path: string, args: any[]): Promise<any> => {
    const { baseUrl, authorization } = this.config;
    const result = await fetch(`${baseUrl}/${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(authorization
          ? {
              Authorization: authorization,
            }
          : {}),
      },
      credentials: authorization ? "include" : undefined,
      method: "POST",
      body: JSON.stringify(args),
    });

    return await result.json();
  };

  createItem = async (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ): Promise<ItemType[UniquelyIdentifyingFieldName]> => {
    return await this.makeRequest("create-item", [newItem]);
  };

  readItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ): Promise<ItemType> => {
    return await this.makeRequest("read-item", [uniqueIdentifier]);
  };

  updateItem = async (updatedItem: Partial<ItemType>): Promise<boolean> => {
    return await this.makeRequest("update-item", [updatedItem]);
  };

  deleteItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ): Promise<boolean> => {
    return await this.makeRequest("delete-item", [uniqueIdentifier]);
  };

  listItems = async (
    config: ListItemsConfig,
  ): Promise<boolean | ListItemsResults<ItemType>> => {
    return await this.makeRequest("list-items", [config]);
  };
}
