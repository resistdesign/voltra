/**
 * @packageDocumentation
 *
 * Driver-backed storage for Voltra operational Health records.
 */
import { DATA_ITEM_DB_DRIVER_ERRORS } from "../api/ORM/drivers/common/Types";
import type {
  DriverHealthStoreOptions,
  HealthRecord,
  HealthRecordCreateInput,
  HealthRecordListOptions,
  HealthRecordPage,
  HealthRecordPutInput,
  HealthRecordUpdateInput,
  HealthStore,
  HealthStoreDriver,
} from "./Types";

/**
 * Persist Voltra Health state through any normal DataItemDBDriver.
 *
 * This keeps Health infrastructure-neutral: DynamoDB, in-memory drivers, and
 * future driver implementations all use the same logical record model.
 */
export class DriverHealthStore implements HealthStore {
  private readonly now: () => number;

  /**
   * @param driver Driver used for the single Health record collection.
   * @param options Optional clock override.
   */
  constructor(
    private readonly driver: HealthStoreDriver,
    options: DriverHealthStoreOptions = {},
  ) {
    this.now = options.now ?? Date.now;
  }

  /** Create a Health record and return its generated id. */
  createRecord = async (record: HealthRecordCreateInput): Promise<string> => {
    const timestamp = this.now();
    return this.driver.createItem({
      ...record,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  };

  /** Write or replace a deterministic Health record id. */
  putRecord = async (
    id: string,
    record: HealthRecordPutInput,
  ): Promise<boolean> => {
    const timestamp = this.now();
    const existing = await this.readRecord(id);
    return this.driver.updateItem(id, {
      ...record,
      id,
      createdAt: record.createdAt ?? existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  };

  /** Read a Health record, returning undefined when it does not exist. */
  readRecord = async (id: string): Promise<HealthRecord | undefined> => {
    try {
      return (await this.driver.readItem(id)) as HealthRecord;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message)
            : undefined;

      if (message === DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND) {
        return undefined;
      }

      throw error;
    }
  };

  /** Update mutable fields on an existing Health record. */
  updateRecord = async (
    id: string,
    changes: HealthRecordUpdateInput,
  ): Promise<boolean> =>
    this.driver.updateItem(id, {
      ...changes,
      updatedAt: this.now(),
    });

  /** Delete a Health record. */
  deleteRecord = async (id: string): Promise<boolean> =>
    this.driver.deleteItem(id);

  /** List a bounded page of Health records. */
  listRecords = async (
    options: HealthRecordListOptions = {},
  ): Promise<HealthRecordPage> => {
    const page = await this.driver.listItems({
      itemsPerPage: Math.max(1, options.itemsPerPage ?? 100),
      cursor: options.cursor,
    });

    return {
      records: page.items as HealthRecord[],
      cursor: page.cursor,
    };
  };
}
