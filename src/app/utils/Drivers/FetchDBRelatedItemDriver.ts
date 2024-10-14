import { DBRelatedItemDriver } from "../../../common/ServiceTypes";
import { ItemRelationshipInfo } from "../../../common";
import {
  FetchDBServiceItemDriver,
  FetchDBServiceItemDriverConfig,
} from "./FetchDBServiceItemDriver";

export class FetchDBRelatedItemDriver
  extends FetchDBServiceItemDriver<ItemRelationshipInfo, "id">
  implements DBRelatedItemDriver
{
  constructor(protected config: FetchDBServiceItemDriverConfig) {
    super(config);
  }
}
