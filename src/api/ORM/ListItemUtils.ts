import { DataItemDBDriver } from "./drivers";
import { TypeInfo, TypeInfoDataItem } from "../../common/TypeParsing/TypeInfo";
import { ListItemsConfig, ListItemsResults } from "../../common/SearchTypes";

/**
 * Make sure that a full page of items is either returned or considered when
 * either filtering items (i.e. for a DAC) or when using a DB Driver that might
 * cut off the number of items returned because of data size or other possible
 * limitations.
 * */
export const satisfyItemsPerPage = async (
  typeInfo: TypeInfo,
  driver: DataItemDBDriver<any, any>,
  config: ListItemsConfig,
  filter?: (item: Partial<TypeInfoDataItem>) => boolean,
  transform?: (item: Partial<TypeInfoDataItem>) => Partial<TypeInfoDataItem>,
  selectedFields?: (keyof TypeInfoDataItem)[],
): Promise<ListItemsResults<Partial<TypeInfoDataItem>>> => {
  const { itemsPerPage = 1, cursor: initialCursor } = config;
  const { primaryField } = typeInfo;

  const filteredItems: Partial<TypeInfoDataItem>[] = [];

  // IMPORTANT: There might not be a cursor in the first place, so we
  // need to make sure that the request is made at least once.
  let ranOnce: boolean = false,
    nextCursor: string | undefined = initialCursor,
    itemsPerPageSatisfied = filteredItems.length >= itemsPerPage,
    leftoverItems: boolean = false,
    lastItem: Partial<TypeInfoDataItem> | undefined = undefined;

  while (!ranOnce || (!itemsPerPageSatisfied && nextCursor)) {
    // IMPORTANT: Make sure this gets marked true immediately.
    ranOnce = true;

    const { items = [], cursor: newCursor } = (await driver.listItems(
      {
        ...config,
        cursor: nextCursor,
      },
      filter ? undefined : selectedFields,
    )) as ListItemsResults<Partial<TypeInfoDataItem>>;

    nextCursor = newCursor;

    for (const itm of items) {
      const includeItem = filter ? filter(itm) : true;

      if (includeItem) {
        const transformedItem = transform ? transform(itm) : itm;

        filteredItems.push(transformedItem);
        itemsPerPageSatisfied = filteredItems.length >= itemsPerPage;

        if (itemsPerPageSatisfied) {
          leftoverItems = items.indexOf(itm) < items.length - 1;
          lastItem = itm;

          break;
        }
      }
    }
  }

  return {
    items: filteredItems,
    cursor: itemsPerPageSatisfied
      ? leftoverItems && lastItem && primaryField
        ? await driver.getItemCursor(lastItem[primaryField])
        : nextCursor
      : undefined,
  };
};
