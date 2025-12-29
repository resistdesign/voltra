import {
  DATA_ITEM_DB_DRIVER_ERRORS,
  DataItemDBDriver,
  DataItemDBDriverConfig,
  SupportedDataItemDBDriverEntry,
} from "./common/Types";
import { v4 as UUIDV4 } from "uuid";
import type { TypeInfoDataItem, TypeInfoPack } from "../../../common/TypeParsing/TypeInfo";
import type { ListItemsConfig, ListItemsResults } from "../../../common/SearchTypes";
import {
  getFilterTypeInfoDataItemsBySearchCriteria,
  getSortedItems,
} from "../../../common/SearchUtils";
import FS from "fs";
import Path from "path";
import { getTypeInfoMapFromTypeScript } from "../../../common/TypeParsing";

type CursorState = {
  offset?: number;
};

const decodeCursor = (cursor?: string): number => {
  if (!cursor) {
    return 0;
  }

  try {
    const parsed = JSON.parse(cursor) as CursorState;
    const offset = parsed.offset ?? 0;
    if (!Number.isFinite(offset) || offset < 0) {
      throw new Error("Invalid cursor offset.");
    }
    return offset;
  } catch (_error) {
    throw {
      message: DATA_ITEM_DB_DRIVER_ERRORS.INVALID_CURSOR,
      cursor,
    };
  }
};

const encodeCursor = (offset: number): string => JSON.stringify({ offset });

const selectFieldsFromItem = <ItemType extends TypeInfoDataItem>(
  item: ItemType,
  selectedFields?: (keyof ItemType)[],
): Partial<ItemType> => {
  if (!selectedFields || selectedFields.length === 0) {
    return { ...item };
  }

  return selectedFields.reduce((accumulator, field) => {
    if (field in item) {
      accumulator[field] = item[field];
    }
    return accumulator;
  }, {} as Partial<ItemType>);
};

export class InMemoryDataItemDBDriver<
  ItemType extends TypeInfoDataItem,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> implements DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>
{
  private items = new Map<ItemType[UniquelyIdentifyingFieldName], ItemType>();

  constructor(
    protected config: DataItemDBDriverConfig<
      ItemType,
      UniquelyIdentifyingFieldName
    >,
  ) {}

  public createItem = async (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
  ): Promise<ItemType[UniquelyIdentifyingFieldName]> => {
    const {
      uniquelyIdentifyingFieldName,
      generateUniqueIdentifier = () => UUIDV4(),
    } = this.config;
    const newItemId = generateUniqueIdentifier(newItem as ItemType) as ItemType[UniquelyIdentifyingFieldName];
    const cleanNewItemWithId = {
      ...newItem,
      [uniquelyIdentifyingFieldName]: newItemId,
    } as unknown as ItemType;

    this.items.set(newItemId, { ...cleanNewItemWithId });

    return newItemId as ItemType[UniquelyIdentifyingFieldName];
  };

  public readItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    selectedFields?: (keyof ItemType)[],
  ): Promise<Partial<ItemType>> => {
    if (typeof uniqueIdentifier === "undefined") {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    }

    const item = this.items.get(uniqueIdentifier);
    if (!item) {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
    }

    return selectFieldsFromItem(item, selectedFields);
  };

  public updateItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    updatedItem: Partial<ItemType>,
  ): Promise<boolean> => {
    const { uniquelyIdentifyingFieldName } = this.config;

    if (typeof uniqueIdentifier === "undefined") {
      throw {
        message: DATA_ITEM_DB_DRIVER_ERRORS.MISSING_UNIQUE_IDENTIFIER,
        uniquelyIdentifyingFieldName,
      };
    }

    const existing = this.items.get(uniqueIdentifier);
    const cleanUpdatedItem: Partial<ItemType> = { ...updatedItem };
    delete cleanUpdatedItem[uniquelyIdentifyingFieldName];

    const nextItem = {
      ...(existing ?? {
        [uniquelyIdentifyingFieldName]: uniqueIdentifier,
      }),
    } as ItemType;

    for (const [key, value] of Object.entries(cleanUpdatedItem)) {
      if (typeof value !== "undefined") {
        (nextItem as Record<string, unknown>)[key] = value;
      }
    }

    this.items.set(uniqueIdentifier, nextItem);

    return true;
  };

  public deleteItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
  ): Promise<boolean> => {
    if (typeof uniqueIdentifier === "undefined") {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    }

    return this.items.delete(uniqueIdentifier);
  };

  public listItems = async (
    config: ListItemsConfig,
    selectedFields?: (keyof ItemType)[],
  ): Promise<ListItemsResults<ItemType>> => {
    const {
      itemsPerPage = 10,
      cursor,
      sortFields,
      criteria,
    } = config;

    const allItems = Array.from(this.items.values());
    const filteredItems = criteria
      ? (getFilterTypeInfoDataItemsBySearchCriteria(
          criteria,
          allItems as TypeInfoDataItem[],
        ) as ItemType[])
      : allItems;
    const sortedItems = getSortedItems(sortFields, filteredItems as TypeInfoDataItem[]) as ItemType[];
    const offset = decodeCursor(cursor);
    const items = sortedItems
      .slice(offset, offset + itemsPerPage)
      .map((item) => selectFieldsFromItem(item, selectedFields) as ItemType);

    const nextOffset = offset + itemsPerPage;

    return {
      items,
      cursor: nextOffset < sortedItems.length ? encodeCursor(nextOffset) : undefined,
    };
  };
}

/**
 * The supported DB driver entry for the in-memory {@link DataItemDBDriver}.
 * */
export const InMemorySupportedDataItemDBDriverEntry: SupportedDataItemDBDriverEntry =
  {
    factory: <
      ItemType extends Record<any, any>,
      UniquelyIdentifyingFieldName extends keyof ItemType,
    >(
      config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
    ): DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> => {
      return new InMemoryDataItemDBDriver(config);
    },
    getDBSpecificConfigTypeInfo: (): TypeInfoPack => {
      const configTypesPath = Path.join(
        __dirname,
        "InMemoryDataItemDBDriver",
        "ConfigTypes.ts",
      );
      const configTypesTS = FS.readFileSync(configTypesPath, "utf8");
      const typeInfoMap = getTypeInfoMapFromTypeScript(configTypesTS);

      return {
        entryTypeName: "InMemorySpecificConfig",
        typeInfoMap,
      };
    },
  };
