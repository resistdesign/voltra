import {
  DATA_ITEM_DB_DRIVER_ERRORS,
  DataItemDBDriver,
  DataItemDBDriverConfig,
  SupportedDataItemDBDriverEntry,
} from "./common/Types";
import type { TypeInfoPack } from "../../../common/TypeParsing/TypeInfo";
import type { ListItemsConfig, ListItemsResults } from "../../../common/SearchTypes";
import { getFilterTypeInfoDataItemsBySearchCriteria, getSortedItems } from "../../../common/SearchUtils";
import type { BaseFileItem } from "./S3FileItemDBDriver";
import { getFullFileKey } from "./S3FileItemDBDriver/S3FileDriver";
import FS from "fs";
import Path from "path";
import { getTypeInfoMapFromTypeScript } from "../../../common/TypeParsing";

type CursorState = {
  offset?: number;
};

export type InMemoryFileSpecificConfig = {
  now?: () => number;
  uploadUrlPrefix?: string;
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

export class InMemoryFileItemDBDriver
  implements DataItemDBDriver<BaseFileItem, "id">
{
  private items = new Map<string, BaseFileItem>();
  private aliases = new Map<string, string>();
  private readonly now: () => number;
  private readonly uploadUrlPrefix: string;
  private readonly downloadUrlPrefix: string;

  constructor(
    protected config: DataItemDBDriverConfig<BaseFileItem, "id">,
  ) {
    const specific = (config.dbSpecificConfig ?? {}) as InMemoryFileSpecificConfig;
    this.now = specific.now ?? (() => Date.now());
    this.uploadUrlPrefix = specific.uploadUrlPrefix ?? "memory://upload/";
    this.downloadUrlPrefix = specific.downloadUrlPrefix ?? "memory://download/";
  }

  private resolveId(id: string): string {
    return this.aliases.get(id) ?? id;
  }

  private buildUrl(prefix: string, id: string): string {
    const { tableName } = this.config;
    return `${prefix}${tableName}/${id}`;
  }

  public createItem = async (
    item: Partial<Omit<BaseFileItem, "id">>,
  ): Promise<string> => {
    const {
      generateUniqueIdentifier,
    } = this.config;

    if (!item?.name) {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    }

    const fileLocation = { name: item.name as string, directory: item.directory };
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

    this.items.set(id, { ...newItem });

    return id;
  };

  public readItem = async (
    uniqueIdentifier: string,
    selectFields?: (keyof BaseFileItem)[],
  ): Promise<Partial<BaseFileItem>> => {
    if (typeof uniqueIdentifier === "undefined") {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    }

    const resolvedId = this.resolveId(uniqueIdentifier);
    const item = this.items.get(resolvedId);

    if (!item) {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
    }

    const selected = selectFieldsFromItem(item, selectFields);

    if (selectFields?.includes("uploadUrl")) {
      selected.uploadUrl = this.buildUrl(this.uploadUrlPrefix, resolvedId);
    }

    if (selectFields?.includes("downloadUrl")) {
      selected.downloadUrl = this.buildUrl(this.downloadUrlPrefix, resolvedId);
    }

    return selected;
  };

  public updateItem = async (
    uniqueIdentifier: string,
    item: Partial<BaseFileItem>,
  ): Promise<boolean> => {
    if (typeof uniqueIdentifier === "undefined") {
      throw {
        message: DATA_ITEM_DB_DRIVER_ERRORS.MISSING_UNIQUE_IDENTIFIER,
        uniquelyIdentifyingFieldName: this.config.uniquelyIdentifyingFieldName,
      };
    }

    const resolvedId = this.resolveId(uniqueIdentifier);
    const existing = this.items.get(resolvedId);

    if (!existing) {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND);
    }

    const directory = typeof item.directory === "undefined" ? existing.directory : item.directory;
    const name = typeof item.name === "undefined" ? existing.name : item.name;
    const nextLocationId =
      name && (name !== existing.name || directory !== existing.directory)
        ? getFullFileKey({ file: { name, directory } })
        : resolvedId;

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

    await this.readItem(uniqueIdentifier);

    return true;
  };

  public deleteItem = async (id: string): Promise<boolean> => {
    if (typeof id === "undefined") {
      throw new Error(DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID);
    }

    await this.readItem(id);

    const resolvedId = this.resolveId(id);
    this.items.delete(resolvedId);
    this.aliases.delete(id);
    this.aliases.delete(resolvedId);

    return true;
  };

  public listItems = async (
    config: ListItemsConfig,
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
    const sortedItems = getSortedItems(sortFields, filteredItems) as BaseFileItem[];
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

      return selectFields ? selectFieldsFromItem(entry as BaseFileItem, selectFields) : entry;
    });

    const nextOffset = offset + itemsPerPage;

    return {
      items: expandedItems,
      cursor: nextOffset < sortedItems.length ? encodeCursor(nextOffset) : undefined,
    };
  };
}

/**
 * The supported DB driver entry for the in-memory file {@link DataItemDBDriver}.
 * */
export const InMemoryFileSupportedDataItemDBDriverEntry: SupportedDataItemDBDriverEntry =
  {
    factory: <
      ItemType extends Record<any, any>,
      UniquelyIdentifyingFieldName extends keyof ItemType,
    >(
      config: DataItemDBDriverConfig<ItemType, UniquelyIdentifyingFieldName>,
    ): DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> => {
      return new InMemoryFileItemDBDriver(config as any) as any;
    },
    getDBSpecificConfigTypeInfo: (): TypeInfoPack => {
      const configTypesPath = Path.join(
        __dirname,
        "InMemoryFileItemDBDriver",
        "ConfigTypes.ts",
      );
      const configTypesTS = FS.readFileSync(configTypesPath, "utf8");
      const typeInfoMap = getTypeInfoMapFromTypeScript(configTypesTS);

      return {
        entryTypeName: "InMemoryFileSpecificConfig",
        typeInfoMap,
      };
    },
  };
