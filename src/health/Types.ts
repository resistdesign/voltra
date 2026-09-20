/**
 * @packageDocumentation
 *
 * Shared health-record contracts for Voltra operational monitoring.
 */
import type { DataItemDBDriver } from "../api/ORM/drivers/common/Types";

/**
 * Kinds stored in the single logical Voltra Health record collection.
 *
 * Consumers may use the generic `custom` kind for application-specific
 * operational metadata without requiring another health table.
 */
export type HealthRecordKind =
  | "operation"
  | "stats"
  | "finding"
  | "repair"
  | "run"
  | "checkpoint"
  | "work"
  | "custom";

/** Lifecycle state for a health record when a state is meaningful. */
export type HealthRecordStatus =
  | "pending"
  | "running"
  | "open"
  | "confirmed"
  | "repaired"
  | "complete"
  | "failed"
  | "dismissed";

/**
 * One extensible record stored by the Voltra Health subsystem.
 *
 * The model intentionally keeps one driver-backed shape for telemetry,
 * findings, repairs, checkpoints, run state, and queued work. Additional
 * structured detail belongs in `data` rather than separate storage models.
 */
export type HealthRecord = {
  /** Unique Health record identifier. */
  id: string;
  /** Semantic purpose of the record. */
  kind: HealthRecordKind;
  /** Millisecond timestamp when the record was first created. */
  createdAt: number;
  /** Millisecond timestamp when the record was last updated. */
  updatedAt: number;
  /** Optional millisecond expiry timestamp for bounded retention. */
  expiresAt?: number;
  /** Optional lifecycle state. */
  status?: HealthRecordStatus;
  /** Optional TypeInfo type associated with the record. */
  typeName?: string;
  /** Optional item identifier associated with the record. */
  itemId?: string | number;
  /** Optional ORM or maintenance operation name. */
  operation?: string;
  /** Optional stable scope key for aggregation/checkpoint records. */
  scope?: string;
  /** Optional run/correlation identifier. */
  correlationId?: string;
  /** Optional count used by compacted metrics or progress records. */
  count?: number;
  /** Optional numeric value used by compacted metrics. */
  value?: number;
  /** Optional opaque continuation token for resumable work. */
  cursor?: string;
  /** Additional structured operational detail. */
  data?: Record<string, unknown>;
};

/** Fields supplied when creating a new Health record. */
export type HealthRecordCreateInput = Omit<
  HealthRecord,
  "id" | "createdAt" | "updatedAt"
>;

/** Fields supplied when writing a deterministic Health record id. */
export type HealthRecordPutInput = Omit<
  HealthRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  /** Preserve the original creation timestamp when replacing an existing record. */
  createdAt?: number;
};

/** Mutable Health record fields accepted by partial updates. */
export type HealthRecordUpdateInput = Partial<
  Omit<HealthRecord, "id" | "createdAt">
>;

/** Bounded list options for the Health store. */
export type HealthRecordListOptions = {
  /** Maximum records to return in one page. */
  itemsPerPage?: number;
  /** Opaque driver continuation token. */
  cursor?: string;
};

/** Bounded page returned by the Health store. */
export type HealthRecordPage = {
  /** Health records in this page. */
  records: HealthRecord[];
  /** Opaque continuation token when additional records remain. */
  cursor?: string;
};

/** Driver contract used to persist the single Health record model. */
export type HealthStoreDriver = DataItemDBDriver<HealthRecord, "id">;

/** Optional runtime behavior for the driver-backed Health store. */
export type DriverHealthStoreOptions = {
  /** Clock used for record timestamps. Defaults to `Date.now`. */
  now?: () => number;
};

/**
 * Storage-neutral Health persistence contract.
 *
 * Implementations must use one logical record collection and preserve bounded
 * paging so health monitoring can run safely in serverless or scheduled jobs.
 */
export type HealthStore = {
  /** Create a Health record and return its generated id. */
  createRecord(record: HealthRecordCreateInput): Promise<string>;
  /** Write or replace a deterministic Health record id. */
  putRecord(id: string, record: HealthRecordPutInput): Promise<boolean>;
  /** Read a Health record, returning undefined when it does not exist. */
  readRecord(id: string): Promise<HealthRecord | undefined>;
  /** Update mutable fields on an existing Health record. */
  updateRecord(
    id: string,
    changes: HealthRecordUpdateInput,
  ): Promise<boolean>;
  /** Delete a Health record. */
  deleteRecord(id: string): Promise<boolean>;
  /** List a bounded page of Health records. */
  listRecords(options?: HealthRecordListOptions): Promise<HealthRecordPage>;
};
