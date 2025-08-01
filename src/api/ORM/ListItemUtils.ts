import { DataItemDBDriver } from "./drivers";
import { TypeInfoDataItem } from "../../common/TypeParsing/TypeInfo";
import { ListItemsConfig, ListItemsResults } from "../../common/SearchTypes";

/**
 * Execute a list items request against a data item driver.
 * */
export const executeDriverListItems = async (
  driver: DataItemDBDriver<any, any>,
  config: ListItemsConfig,
  filter?: (item: Partial<TypeInfoDataItem>) => boolean,
  transform?: (item: Partial<TypeInfoDataItem>) => Partial<TypeInfoDataItem>,
  selectedFields?: (keyof TypeInfoDataItem)[],
): Promise<ListItemsResults<Partial<TypeInfoDataItem>>> => {
  const filteredItems: Partial<TypeInfoDataItem>[] = [];
  const { items = [], cursor: newCursor } = (await driver.listItems(
    config,
    filter ? undefined : selectedFields,
  )) as ListItemsResults<Partial<TypeInfoDataItem>>;

  for (const itm of items) {
    const includeItem = filter ? filter(itm) : true;

    if (includeItem) {
      const transformedItem = transform ? transform(itm) : itm;

      filteredItems.push(transformedItem);
    }
  }

  return {
    items: filteredItems,
    cursor: newCursor,
  };
};
