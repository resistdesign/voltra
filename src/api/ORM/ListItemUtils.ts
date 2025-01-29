import { DataItemDBDriver } from "./drivers";
import { ListItemsConfig, ListItemsResults } from "../../common";
import { TypeInfoDataItem } from "../../common/TypeParsing/TypeInfo";

/**
 * Make sure that a full page of items is either returned or considered when
 * either filtering items (i.e. for a DAC) or when using a DB Driver that might
 * cut off the number of items returned because of data size or other possible
 * limitations.
 * */
export const satisfyItemsPerPage = async (
  driver: DataItemDBDriver<any, any>,
  config: ListItemsConfig,
  filter?: (item: Partial<TypeInfoDataItem>) => boolean,
  transform?: (item: Partial<TypeInfoDataItem>) => Partial<TypeInfoDataItem>,
  selectedFields?: (keyof TypeInfoDataItem)[],
): Promise<boolean | ListItemsResults<Partial<TypeInfoDataItem>>> => {
  const { itemsPerPage = 1, checkExistence, cursor: initialCursor } = config;

  if (checkExistence && !filter) {
    return await driver.listItems(config, selectedFields);
  } else {
    const filteredItems: Partial<TypeInfoDataItem>[] = [];

    let nextCursor: string | undefined = initialCursor,
      itemsPerPageSatisfied = filteredItems.length >= itemsPerPage;

    while (!itemsPerPageSatisfied && nextCursor) {
      const { items = [], cursor: newCursor } = (await driver.listItems(
        {
          ...config,
          cursor: nextCursor,
          checkExistence: false,
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
            break;
          }
        }
      }
    }

    return checkExistence
      ? filteredItems.length > 0
      : {
          items: filteredItems,
          cursor: itemsPerPageSatisfied ? nextCursor : undefined,
        };
  }
};
