import {
  TypeInfoORMServiceError,
  TypeInfoORMCreateConfig,
  TypeInfoORMReadConfig,
  TypeInfoORMUpdateConfig,
} from "../../../common/TypeInfoORM";
import {
  DATA_ITEM_DB_DRIVER_ERRORS,
  DataItemOperationConfig,
  CanonicalWriteCommittedError,
  DataItemDBDriver,
  DataItemDBDriverConfig,
  SupportedDataItemDBDriverEntry,
} from "./common/Types";
import type {
  TypeInfoMap,
  TypeInfoPack,
} from "../../../common/TypeParsing/TypeInfo";
import type {
  ListItemsConfig,
  ListItemsResults,
} from "../../../common/SearchTypes";
import {
  getFilterTypeInfoDataItemsBySearchCriteria,
  getSortedItems,
} from "../../../common/SearchUtils";
import type { BaseFileItem } from "./S3FileItemDBDriver";
import { getFullFileKey } from "./S3FileItemDBDriver/S3FileDriver";
import ConfigTypeInfoMap from "./InMemoryFileItemDBDriver/ConfigTypeInfoMap.json";

type CursorState = {
  offset?: number;
};

/**
 * Configuration overrides for the in-memory file driver.
 */
export type InMemoryFileSpecificConfig = {
  /**
   * Optional time source for updatedOn timestamps.
   */
  now?: () => number;
  /**
   * Prefix used when generating upload URLs.
   */
  uploadUrlPrefix?: string;
  /**
   * Prefix used when generating download URLs.
   */
  downloadUrlPrefix?: string;
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

const selectFieldsFromItem = (
  item: BaseFileItem,
  selectedFields?: (keyof BaseFileItem)[],
): Partial<BaseFileItem> => {
  if (!selectedFields || selectedFields.length === 0) {
    return { ...item };
  }

  return selectedFields.reduce((accumulator, field) => {
    if (field in item) {
      (accumulator as Record<string, unknown>)[String(field)] = item[field];
    }
    return accumulator;
  }, {} as Partial<BaseFileItem>);
};

/**
 * In-memory file driver backed by local state.
 */
export class InMemoryFileItemDBDriver implements DataItemDBDriver<
  BaseFileItem,
  "id"
> {
  private items = new Map<string, BaseFileItem>();
  private aliases = new Map<string, string>();
  private readonly now: () => number;
  private readonly uploadUrlPrefix: string;
  private readonly downloadUrlPrefix: string;

  constructor(
    /**
     * Driver configuration including table name and config overrides.
     */
    protected config: DataItemDBDriverConfig<BaseFileItem, "id">,
  ) {
    const specific = (config.dbSpecificConfig ??
      {}) as InMemoryFileSpecificConfig;
    this.now = specific.now ?? (() => Date.now());
    this.uploadUrlPrefix = specific.uploadUrlPrefix ?? "memory://upload/";
    this.downloadUrlPrefix = specific.downloadUrlPrefix ?? "memory://download/";
  }

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

  private snapshot = (id: string) => {
    const item = this.items.get(this.resolveId(id));
    return item ? structuredClone(item) : undefined;
  };

  private notify = async (
    options: DataItemOperationConfig<BaseFileItem> | undefined,
    before: BaseFileItem | undefined,
    after: BaseFileItem | undefined,
  ) => {
    try {
      await options?.coordination?.changed?.(before, after);
    } catch (cause) {
      throw new CanonicalWriteCommittedError(cause);
    }
  };

  private resolveId(id: string): string {
    return this.aliases.get(id) ?? id;
  }

  private buildUrl(prefix: string, id: string): string {
    const { tableName } = this.config;
    return `${prefix}${tableName}/${id}`;
  }

  /**
   * Create a new file item in memory.
   * @returns Generated file id.
   */
  public createItem = async (
    /**
     * New file item payload without the id field.
     */
    item: Partial<Omit<BaseFileItem, "id">>,
    createConfig?: TypeInfoORMCreateConfig &
      DataItemOperationConfig<BaseFileItem>,
  ): Promise<string> =>
    this.coordinate(async () => {
      if (createConfig?.ifAbsent)
        throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
      const { generateUniqueIdentifier } = this.config;

      if (!item?.name) {
        throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
      }

      const fileLocation = {
        name: item.name as string,
        directory: item.directory,
      };
      const id =
        typeof generateUniqueIdentifier === "function"
          ? String(generateUniqueIdentifier(item as BaseFileItem))
          : getFullFileKey({ file: fileLocation });
      const mimeType = item.mimeType ?? "application/octet-stream";

      const newItem: BaseFileItem = {
        id,
        name: item.name,
        directory: item.directory,
        updatedOn: this.now(),
        mimeType,
        sizeInBytes: item.sizeInBytes ?? 0,
        isDirectory: item.isDirectory ?? mimeType === "application/x-directory",
      };

      const before = this.snapshot(id);
      // An alias names a different canonical identity after a rename. Reusing
      // it would make the single-identity mutation images ambiguous.
      if (this.aliases.has(id))
        throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
      await createConfig?.coordination?.inspect?.(before);
      this.items.set(id, structuredClone(newItem));
      await this.notify(createConfig, before, this.snapshot(id));

      return id;
    });

  /**
   * Read a file item from memory.
   * @param _readConfig Required consistency; canonical reads honor strong consistency.
   * @returns File item payload (partial when selected fields are used).
   */
  public readItem = async (
    /**
     * Unique identifier value for the file.
     */
    uniqueIdentifier: string,
    /**
     * Optional fields to select from the file item.
     */
    selectFields?: (keyof BaseFileItem)[],
    _readConfig?: TypeInfoORMReadConfig & DataItemOperationConfig<BaseFileItem>,
  ): Promise<Partial<BaseFileItem>> => {
    const read = async () => {
      if (typeof uniqueIdentifier === "undefined") {
        throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
      }

      const resolvedId = this.resolveId(uniqueIdentifier);
      const item = this.snapshot(resolvedId);
      await _readConfig?.coordination?.inspect?.(item);

      if (!item) {
        throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
      }

      const selected = selectFieldsFromItem(item, selectFields);

      if (selectFields?.includes("uploadUrl")) {
        selected.uploadUrl = this.buildUrl(this.uploadUrlPrefix, resolvedId);
      }

      if (selectFields?.includes("downloadUrl")) {
        selected.downloadUrl = this.buildUrl(
          this.downloadUrlPrefix,
          resolvedId,
        );
      }

      return selected;
    };
    return _readConfig?.coordination ? this.coordinate(read) : read();
  };

  /**
   * Update a file item in memory.
   * Conditional canonical updates are unsupported and fail before file I/O.
   * @returns True when the item was updated.
   */
  public updateItem = async (
    /**
     * Unique identifier value for the file.
     */
    uniqueIdentifier: string,
    /**
     * Partial update payload for the file.
     */
    item: Partial<BaseFileItem>,
    updateConfig?: TypeInfoORMUpdateConfig &
      DataItemOperationConfig<BaseFileItem>,
  ): Promise<boolean> =>
    this.coordinate(async () => {
      if (updateConfig?.preconditions !== undefined) {
        throw new Error(TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY);
      }
      if (typeof uniqueIdentifier === "undefined") {
        throw {
          message: DATA_ITEM_DB_DRIVER_ERRORS.MISSING_UNIQUE_IDENTIFIER,
          uniquelyIdentifyingFieldName:
            this.config.uniquelyIdentifyingFieldName,
        };
      }

      const resolvedId = this.resolveId(uniqueIdentifier);
      const existing = this.snapshot(resolvedId);
      await updateConfig?.coordination?.inspect?.(existing);

      if (!existing) {
        throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
      }

      const directory =
        typeof item.directory === "undefined"
          ? existing.directory
          : item.directory;
      const name = typeof item.name === "undefined" ? existing.name : item.name;
      const nextLocationId =
        name && (name !== existing.name || directory !== existing.directory)
          ? getFullFileKey({ file: { name, directory } })
          : resolvedId;

      if (
        nextLocationId !== resolvedId &&
        (this.items.has(nextLocationId) || this.aliases.has(nextLocationId))
      )
        throw new Error(TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT);

      const updated: BaseFileItem = {
        ...existing,
        ...item,
        id: nextLocationId,
        name,
        directory,
        updatedOn: this.now(),
      };

      if (nextLocationId !== resolvedId) {
        this.items.delete(resolvedId);
        this.items.set(nextLocationId, updated);
        this.aliases.set(uniqueIdentifier, nextLocationId);
        this.aliases.set(resolvedId, nextLocationId);
      } else {
        this.items.set(resolvedId, updated);
      }

      await this.notify(
        updateConfig,
        existing,
        this.snapshot(uniqueIdentifier),
      );
      return true;
    });

  /**
   * Delete a file item from memory.
   * @returns True when the item was deleted.
   */
  public deleteItem = async (
    id: string,
    deleteConfig?: DataItemOperationConfig<BaseFileItem>,
  ): Promise<boolean> =>
    this.coordinate(async () => {
      if (typeof id === "undefined") {
        throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
      }

      const before = this.snapshot(id);
      await deleteConfig?.coordination?.inspect?.(before);
      if (!before) throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
      const resolvedId = this.resolveId(id);
      this.items.delete(resolvedId);
      this.aliases.delete(id);
      this.aliases.delete(resolvedId);
      await this.notify(deleteConfig, before, undefined);
      return true;
    });

  /**
   * List file items from memory.
   * @returns List results with items and cursor.
   */
  public listItems = async (
    /**
     * List configuration and criteria.
     */
    config: ListItemsConfig,
    /**
     * Optional fields to select from each file item.
     */
    selectFields?: (keyof BaseFileItem)[],
  ): Promise<ListItemsResults<Partial<BaseFileItem>>> => {
    const {
      itemsPerPage = Infinity,
      cursor,
      sortFields = [],
      criteria,
    } = config;
    const allItems = Array.from(this.items.values());
    const filteredItems = criteria
      ? (getFilterTypeInfoDataItemsBySearchCriteria(
          criteria,
          allItems,
        ) as BaseFileItem[])
      : allItems;
    const sortedItems = getSortedItems(
      sortFields,
      filteredItems,
    ) as BaseFileItem[];
    const offset = decodeCursor(cursor);
    const slice = sortedItems.slice(offset, offset + itemsPerPage);
    const expandedItems = slice.map((item) => {
      const entry = { ...item } as Partial<BaseFileItem>;

      if (selectFields?.includes("uploadUrl")) {
        entry.uploadUrl = this.buildUrl(this.uploadUrlPrefix, item.id);
      }

      if (selectFields?.includes("downloadUrl")) {
        entry.downloadUrl = this.buildUrl(this.downloadUrlPrefix, item.id);
      }

      return selectFields
        ? selectFieldsFromItem(entry as BaseFileItem, selectFields)
        : entry;
    });

    const nextOffset = offset + itemsPerPage;

    return {
      items: expandedItems,
      cursor:
        nextOffset < sortedItems.length ? encodeCursor(nextOffset) : undefined,
    };
  };
}

/**
 * The supported DB driver entry for the in-memory file {@link DataItemDBDriver}.
 * */
export const InMemoryFileSupportedDataItemDBDriverEntry: SupportedDataItemDBDriverEntry =
  {
    /**
     * @param config Driver configuration.
     * @returns In-memory file driver instance.
     */
    factory: <
      ItemType extends Record<any, any>,
      UniquelyIdentifyingFieldName extends keyof ItemType,
    >(
      config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
    ): DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> => {
      return new InMemoryFileItemDBDriver(config as any) as any;
    },
    /**
     * @returns Type info pack for the in-memory file config.
     */
    getDBSpecificConfigTypeInfo: (): TypeInfoPack => {
      return {
        entryTypeName: "InMemoryFileSpecificConfig",
        typeInfoMap: ConfigTypeInfoMap as TypeInfoMap,
      };
    },
  };
