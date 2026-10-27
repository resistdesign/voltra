import {
  DATA_ITEM_DB_DRIVER_ERRORS,
  DataItemOperationConfig,
  CanonicalWriteCommittedError,
  DataItemDBDriver,
  DataItemDBDriverConfig,
  SupportedDataItemDBDriverEntry,
} from "./common/Types";
import { v4 as UUIDV4 } from "uuid";
import type {
  TypeInfoDataItem,
  TypeInfoMap,
  TypeInfoPack,
} from "../../../common/TypeParsing/TypeInfo";
import type {
  ListItemsConfig,
  ListItemsResults,
} from "../../../common/SearchTypes";
import {
  TypeInfoORMServiceError,
  TypeInfoORMCreateConfig,
  TypeInfoORMReadConfig,
  TypeInfoORMUpdateConfig,
  TypeInfoORMUpdateOperators,
} from "../../../common/TypeInfoORM";
import {
  getFilterTypeInfoDataItemsBySearchCriteria,
  getSortedItems,
} from "../../../common/SearchUtils";
import ConfigTypeInfoMap from "./InMemoryDataItemDBDriver/ConfigTypeInfoMap.json";

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

const selectFieldsFromItem = <ItemType extends Record<string, any>>(
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

/**
 * In-memory data item driver for testing and local usage.
 */
export class InMemoryDataItemDBDriver<
  ItemType extends Record<string, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> implements DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> {
  private items = new Map<ItemType[UniquelyIdentifyingFieldName], ItemType>();

  constructor(
    /**
     * Driver configuration including table name and identifier settings.
     */
    protected config: DataItemDBDriverConfig<
      ItemType,
      UniquelyIdentifyingFieldName
    >,
  ) {}

  // Store-wide exclusion also covers relationship identities and direct writes.
  // This store is private to this instance; no external persistence writers exist.
  private pending: Promise<void> = Promise.resolve();

  private coordinate = async <Result>(
    operation: () => Promise<Result>,
  ): Promise<Result> => {
    const previous = this.pending;
    let release!: () => void;
    this.pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  };

  private snapshot = (id: ItemType[UniquelyIdentifyingFieldName]) => {
    const item = this.items.get(id);
    return item ? structuredClone(item) : undefined;
  };

  private notify = async (
    config: DataItemOperationConfig<ItemType> | undefined,
    before: ItemType | undefined,
    after: ItemType | undefined,
  ) => {
    try {
      await config?.coordination?.changed?.(before, after);
    } catch (cause) {
      throw new CanonicalWriteCommittedError(cause);
    }
  };

  /** Create under exclusion, exposing exact overwrite images to coordinated work. */
  public createItem = (
    newItem: Partial<Omit<ItemType, UniquelyIdentifyingFieldName>>,
    createConfig?: TypeInfoORMCreateConfig & DataItemOperationConfig<ItemType>,
  ) =>
    this.coordinate(async () => {
      const id = (this.config.generateUniqueIdentifier ?? (() => UUIDV4()))(
        newItem as ItemType,
      ) as ItemType[UniquelyIdentifyingFieldName];
      const before = this.snapshot(id);
      await createConfig?.coordination?.inspect?.(before);
      if (createConfig?.ifAbsent && before)
        throw new Error(TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT);
      this.items.set(
        id,
        structuredClone({
          ...newItem,
          [this.config.uniquelyIdentifyingFieldName]: id,
        }) as ItemType,
      );
      await this.notify(createConfig, before, this.snapshot(id));
      return id;
    });

  /**
   * Read an item from memory.
   * @param uniqueIdentifier Unique identifier value for the item.
   * @param selectedFields Optional fields to select from the item.
   * @param readConfig Required consistency and canonical coordination requirements.
   * @returns Item payload (partial when selected fields are used).
   */
  public readItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    selectedFields?: (keyof ItemType)[],
    readConfig?: TypeInfoORMReadConfig & DataItemOperationConfig<ItemType>,
  ): Promise<Partial<ItemType>> => {
    const read = async () => {
      if (typeof uniqueIdentifier === "undefined") {
        throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
      }

      const item = this.snapshot(uniqueIdentifier);
      await readConfig?.coordination?.inspect?.(item);
      if (!item) {
        throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
      }

      return selectFieldsFromItem(item, selectedFields);
    };
    return readConfig?.coordination ? this.coordinate(read) : read();
  };

  /**
   * Update an item in memory.
   * @param uniqueIdentifier Unique identifier value for the item.
   * @param updatedItem Partial update payload for the item.
   * @returns True when the item was updated.
   */
  public updateItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    updatedItem: Partial<ItemType>,
    updateConfig?: TypeInfoORMUpdateConfig & DataItemOperationConfig<ItemType>,
  ): Promise<boolean> =>
    this.coordinate(async () => {
      const { uniquelyIdentifyingFieldName } = this.config;

      if (typeof uniqueIdentifier === "undefined") {
        throw {
          message: DATA_ITEM_DB_DRIVER_ERRORS.MISSING_UNIQUE_IDENTIFIER,
          uniquelyIdentifyingFieldName,
        };
      }

      const existing = this.snapshot(uniqueIdentifier);
      await updateConfig?.coordination?.inspect?.(existing);
      if (updateConfig?.preconditions !== undefined) {
        if (
          !existing ||
          Object.entries(updateConfig.preconditions.expected ?? {}).some(
            ([field, value]) => existing[field] !== value,
          )
        ) {
          throw new Error(TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT);
        }
      }
      const cleanUpdatedItem: Partial<ItemType> = { ...updatedItem };
      delete cleanUpdatedItem[uniquelyIdentifyingFieldName];

      const nextItem = {
        ...(existing ?? {
          [uniquelyIdentifyingFieldName]: uniqueIdentifier,
        }),
      } as ItemType;

      for (const [key, value] of Object.entries(cleanUpdatedItem)) {
        if (typeof value !== "undefined") {
          const operator = updateConfig?.fieldOperators?.[key];

          if (operator === TypeInfoORMUpdateOperators.NUMBER.INCREMENT) {
            const currentValue = (nextItem as Record<string, unknown>)[key];

            (nextItem as Record<string, unknown>)[key] =
              (typeof currentValue === "number" ? currentValue : 0) +
              (value as number);
            continue;
          }

          if (operator === TypeInfoORMUpdateOperators.NUMBER.DECREMENT) {
            const currentValue = (nextItem as Record<string, unknown>)[key];

            (nextItem as Record<string, unknown>)[key] =
              (typeof currentValue === "number" ? currentValue : 0) -
              (value as number);
            continue;
          }

          (nextItem as Record<string, unknown>)[key] = value;
        }
      }

      this.items.set(uniqueIdentifier, structuredClone(nextItem));
      await this.notify(
        updateConfig,
        existing,
        this.snapshot(uniqueIdentifier),
      );
      return true;
    });

  /**
   * Delete an item from memory.
   * @param uniqueIdentifier Unique identifier value for the item.
   * @returns True when the item was deleted.
   */
  public deleteItem = async (
    uniqueIdentifier: ItemType[UniquelyIdentifyingFieldName],
    deleteConfig?: DataItemOperationConfig<ItemType>,
  ): Promise<boolean> =>
    this.coordinate(async () => {
      if (typeof uniqueIdentifier === "undefined") {
        throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
      }

      const before = this.snapshot(uniqueIdentifier);
      await deleteConfig?.coordination?.inspect?.(before);
      const result = this.items.delete(uniqueIdentifier);
      if (result) await this.notify(deleteConfig, before, undefined);
      return result;
    });

  /**
   * List items from memory.
   * @param config List configuration and criteria.
   * @param selectedFields Optional fields to select from each item.
   * @returns List results with items and cursor.
   */
  public listItems = async (
    config: ListItemsConfig,
    selectedFields?: (keyof ItemType)[],
  ): Promise<ListItemsResults<ItemType>> => {
    const { itemsPerPage = 10, cursor, sortFields, criteria } = config;

    const allItems = Array.from(this.items.values());
    const filteredItems = criteria
      ? (getFilterTypeInfoDataItemsBySearchCriteria(
          criteria,
          allItems as TypeInfoDataItem[],
        ) as ItemType[])
      : allItems;
    const sortedItems = getSortedItems(
      sortFields,
      filteredItems as TypeInfoDataItem[],
    ) as ItemType[];
    const offset = decodeCursor(cursor);
    const items = sortedItems
      .slice(offset, offset + itemsPerPage)
      .map(
        (item) =>
          selectFieldsFromItem(
            structuredClone(item),
            selectedFields,
          ) as ItemType,
      );

    const nextOffset = offset + itemsPerPage;

    return {
      items,
      cursor:
        nextOffset < sortedItems.length ? encodeCursor(nextOffset) : undefined,
    };
  };
}

/**
 * The supported DB driver entry for the in-memory {@link DataItemDBDriver}.
 * */
export const InMemorySupportedDataItemDBDriverEntry: SupportedDataItemDBDriverEntry =
  {
    /**
     * @param config Driver configuration.
     * @returns In-memory driver instance.
     */
    factory: <
      ItemType extends Record<any, any>,
      UniquelyIdentifyingFieldName extends keyof ItemType,
    >(
      config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
    ): DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> => {
      return new InMemoryDataItemDBDriver(config);
    },
    /**
     * @returns Type info pack for the in-memory config.
     */
    getDBSpecificConfigTypeInfo: (): TypeInfoPack => {
      return {
        entryTypeName: "InMemorySpecificConfig",
        typeInfoMap: ConfigTypeInfoMap as TypeInfoMap,
      };
    },
  };
