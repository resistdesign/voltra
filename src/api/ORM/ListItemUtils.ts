/**
 * @packageDocumentation
 *
 * Utilities for list operations that wrap a driver with optional filtering and
 * transformation. This is useful when you want client-side filtering but still
 * reuse the driver paging contract.
 */
import { DataItemDBDriver } from "./drivers";
import { TypeInfoDataItem } from "../../common/TypeParsing/TypeInfo";
import { ListItemsConfig, ListItemsResults } from "../../common/SearchTypes";

/**
 * Execute a list items request against a data item driver.
 *
 * Notes:
 * - If a filter is supplied, selected fields are not forwarded to the driver
 *   to ensure the filter sees full items.
 * - Transform runs after filter and before the response is returned.
 * @returns List results with filtered/transformed items and cursor.
 */
export const executeDriverListItems = async (
  /**
   * Driver used to list items.
   */
  driver: DataItemDBDriver<any, any>,
  /**
   * List configuration passed to the driver.
   */
  config: ListItemsConfig,
  /**
   * Optional client-side filter predicate.
   */
  filter?: (item: Partial<TypeInfoDataItem>) => boolean,
  /**
   * Optional transform applied to each included item.
   */
  transform?: (item: Partial<TypeInfoDataItem>) => Partial<TypeInfoDataItem>,
  /**
   * Optional field selection passed to the driver when no filter is used.
   */
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
