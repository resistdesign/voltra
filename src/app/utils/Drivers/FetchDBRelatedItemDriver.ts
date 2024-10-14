import { DBRelatedItemDriver } from "../../../common/ServiceTypes";
import { ItemRelationshipInfo } from "../../../common";

export class FetchDBRelatedItemDriver implements DBRelatedItemDriver {
  createItem(
    newItem: Partial<Omit<ItemRelationshipInfo, "id">>,
  ): Promise<ItemRelationshipInfo["id"]> {
    throw new Error("Method not implemented.");
  }

  readItem(
    uniqueIdentifier: ItemRelationshipInfo["id"],
  ): Promise<ItemRelationshipInfo> {
    throw new Error("Method not implemented.");
  }

  updateItem(updatedItem: Partial<ItemRelationshipInfo>): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  deleteItem(uniqueIdentifier: ItemRelationshipInfo["id"]): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  listItems(
    config: import("../../../common/SearchTypes").ListItemsConfig,
  ): Promise<
    | boolean
    | import("../../../common/SearchTypes").ListItemsResults<ItemRelationshipInfo>
  > {
    throw new Error("Method not implemented.");
  }
}
