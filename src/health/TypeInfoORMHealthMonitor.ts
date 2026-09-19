/**
 * @packageDocumentation
 *
 * Bounded, resumable TypeInfoORM health auditing and guarded repair.
 */
import type {
  TypeInfoORMIndexMaintenanceTypeDescriptor,
  TypeInfoORMService,
} from "../api/ORM/TypeInfoORMService";
import type { DocId } from "../api/Indexing/Types";
import { DriverHealthStore } from "./DriverHealthStore";
import type {
  HealthRecord,
  HealthStore,
  HealthStoreDriver,
} from "./Types";

/** Destructive behavior for one Health monitor run. */
export type TypeInfoORMHealthRepairMode = "preview" | "apply";

/** Per-run overrides for the Health monitor. */
export type TypeInfoORMHealthMonitorRunOptions = {
  /** Preview findings without writes, or apply strongly validated repairs. */
  repairMode?: TypeInfoORMHealthRepairMode;
};

/** Result summary returned by one bounded Health monitor run. */
export type TypeInfoORMHealthMonitorRunResult = {
  /** Health run record id. */
  runId: string;
  /** Repair mode used by this run. */
  repairMode: TypeInfoORMHealthRepairMode;
  /** Index document/field mirrors examined. */
  examinedCount: number;
  /** Missing-canonical findings observed. */
  orphanFindingCount: number;
  /** Findings confirmed with strongly consistent canonical reads. */
  confirmedOrphanCount: number;
  /** Guarded repairs completed. */
  repairedCount: number;
  /** Findings that could not be safely scoped or maintained. */
  suspiciousCount: number;
  /** Expired Health records removed during bounded retention cleanup. */
  expiredRecordCount: number;
  /** True when the current index-audit cycle has more persisted work. */
  continuation: boolean;
};

/** Shared monitor behavior independent of deployment/runtime choice. */
export type TypeInfoORMHealthMonitorOptions = {
  /** Default repair behavior. Defaults to preview. */
  repairMode?: TypeInfoORMHealthRepairMode;
  /** Maximum index mirrors examined in one scheduled run. */
  maxIndexDocumentsPerRun?: number;
  /** Maximum destructive repairs applied in one run. */
  maxRepairsPerRun?: number;
  /** Maximum physical index records requested per backend page. */
  indexPageSize?: number;
  /** Finding/repair retention duration. Defaults to seven days. */
  recordRetentionMs?: number;
  /** Maximum Health records considered for expiry cleanup per run. */
  retentionPageSize?: number;
  /** Clock used for run timestamps and retention. */
  now?: () => number;
};

type HealthMonitorStorageConfig =
  | {
      /** Prebuilt Health store. */
      store: HealthStore;
      /** Driver is omitted when a store is supplied. */
      driver?: never;
    }
  | {
      /** Normal ORM-style driver backing the single Health record collection. */
      driver: HealthStoreDriver;
      /** Store is constructed automatically from the driver. */
      store?: never;
    };

/** Configuration for {@link TypeInfoORMHealthMonitor}. */
export type TypeInfoORMHealthMonitorConfig = TypeInfoORMHealthMonitorOptions &
  HealthMonitorStorageConfig & {
    /** Fully configured ORM instance used by the application. */
    orm: TypeInfoORMService;
  };

type AuditCheckpointData = {
  structuredCursor?: string;
  structuredComplete?: boolean;
  textCursor?: string;
  textComplete?: boolean;
  retentionCursor?: string;
};

type AuditSource = "structured" | "text";

type AuditCandidate = {
  typeName: string;
  docId: DocId;
  source: AuditSource;
  structuredVersion?: number;
  textIndexFields?: string[];
};

const INDEX_AUDIT_CHECKPOINT_ID = "health:index-audit";
const DEFAULT_RECORD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const identityKey = (typeName: string, docId: DocId): string =>
  JSON.stringify([typeName, typeof docId, docId]);

const findingId = (typeName: string, docId: DocId): string =>
  `health:finding:orphan:${encodeURIComponent(typeName)}:${encodeURIComponent(
    JSON.stringify([typeof docId, docId]),
  )}`;

/**
 * Audit and repair TypeInfoORM operational health in bounded scheduled passes.
 *
 * The class contains no Lambda, Fargate, EventBridge, or queue assumptions.
 * Callers may invoke {@link run}, {@link preview}, or {@link repair} anywhere
 * TypeScript can run, and persisted checkpoint state resumes larger audits.
 */
export class TypeInfoORMHealthMonitor {
  private readonly orm: TypeInfoORMService;
  private readonly store: HealthStore;
  private readonly options: Required<TypeInfoORMHealthMonitorOptions>;
  private readonly descriptors: TypeInfoORMIndexMaintenanceTypeDescriptor[];

  /**
   * @param config Monitor configuration and Health persistence.
   */
  constructor(config: TypeInfoORMHealthMonitorConfig) {
    this.orm = config.orm;
    this.store =
      config.store ??
      new DriverHealthStore(config.driver, {
        now: config.now,
      });
    this.options = {
      repairMode: config.repairMode ?? "preview",
      maxIndexDocumentsPerRun: Math.max(
        1,
        config.maxIndexDocumentsPerRun ?? 200,
      ),
      maxRepairsPerRun: Math.max(0, config.maxRepairsPerRun ?? 20),
      indexPageSize: Math.max(1, config.indexPageSize ?? 100),
      recordRetentionMs: Math.max(
        1,
        config.recordRetentionMs ?? DEFAULT_RECORD_RETENTION_MS,
      ),
      retentionPageSize: Math.max(1, config.retentionPageSize ?? 100),
      now: config.now ?? Date.now,
    };
    this.descriptors = this.orm.getIndexMaintenanceTypeDescriptors();
  }

  /** Run a non-destructive bounded Health audit. */
  preview = async (): Promise<TypeInfoORMHealthMonitorRunResult> =>
    this.run({ repairMode: "preview" });

  /** Run a bounded audit and apply only strongly validated repairs. */
  repair = async (): Promise<TypeInfoORMHealthMonitorRunResult> =>
    this.run({ repairMode: "apply" });

  /**
   * Run one bounded Health pass.
   * @param options Per-run behavior overrides.
   * @returns Run summary and continuation indication.
   */
  run = async (
    options: TypeInfoORMHealthMonitorRunOptions = {},
  ): Promise<TypeInfoORMHealthMonitorRunResult> => {
    const repairMode = options.repairMode ?? this.options.repairMode;
    const now = this.options.now();
    const runId = await this.store.createRecord({
      kind: "run",
      status: "running",
      operation: "indexAudit",
      expiresAt: now + this.options.recordRetentionMs,
      data: { repairMode },
    });
    const checkpoint = await this.readCheckpoint();
    const seen = new Set<string>();
    let examinedCount = 0;
    let orphanFindingCount = 0;
    let confirmedOrphanCount = 0;
    let repairedCount = 0;
    let suspiciousCount = 0;
    let remainingBudget = this.options.maxIndexDocumentsPerRun;

    const auditCandidate = async (candidate: AuditCandidate): Promise<void> => {
      const key = identityKey(candidate.typeName, candidate.docId);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      const verification =
        await this.orm.verifyStoredItemForIndexMaintenance(
          candidate.typeName,
          candidate.docId,
        );
      examinedCount += 1;

      if (verification.exists) {
        return;
      }

      orphanFindingCount += 1;
      const confirmed = verification.consistency === "strong";
      if (confirmed) {
        confirmedOrphanCount += 1;
      }

      await this.store.putRecord(findingId(candidate.typeName, candidate.docId), {
        kind: "finding",
        status: confirmed ? "confirmed" : "open",
        typeName: candidate.typeName,
        itemId: candidate.docId,
        scope: "orphanedIndex",
        correlationId: runId,
        expiresAt: now + this.options.recordRetentionMs,
        data: {
          findingType: "orphanedIndex",
          source: candidate.source,
          consistency: verification.consistency,
          ...(candidate.structuredVersion !== undefined
            ? { structuredVersion: candidate.structuredVersion }
            : {}),
        },
      });

      if (
        repairMode !== "apply" ||
        !confirmed ||
        repairedCount >= this.options.maxRepairsPerRun
      ) {
        return;
      }

      const cleanup = await this.orm.cleanupOrphanedIndexState(
        candidate.typeName,
        candidate.docId,
        {
          structuredVersion: candidate.structuredVersion,
          textIndexFields: candidate.textIndexFields,
        },
      );

      await this.store.createRecord({
        kind: "repair",
        status:
          cleanup.status === "cleaned" ||
          cleanup.status === "concurrentCanonicalRestored"
            ? "repaired"
            : "open",
        typeName: candidate.typeName,
        itemId: candidate.docId,
        operation: "orphanedIndexCleanup",
        correlationId: runId,
        expiresAt: now + this.options.recordRetentionMs,
        data: cleanup,
      });

      if (
        cleanup.status === "cleaned" ||
        cleanup.status === "concurrentCanonicalRestored"
      ) {
        repairedCount += 1;
        await this.store.updateRecord(
          findingId(candidate.typeName, candidate.docId),
          {
            status: "repaired",
            correlationId: runId,
          },
        );
      } else if (
        cleanup.status === "maintenanceUnsupported" ||
        cleanup.status === "strongConsistencyUnavailable"
      ) {
        suspiciousCount += 1;
      }
    };

    const descriptorForField = (
      field: string,
    ): TypeInfoORMIndexMaintenanceTypeDescriptor | undefined => {
      const matches = this.descriptors.filter((descriptor) =>
        field.startsWith(descriptor.qualifiedFieldPrefix),
      );
      return matches.length === 1 ? matches[0] : undefined;
    };

    if (!checkpoint.structuredComplete && remainingBudget > 0) {
      const page = await this.orm.listStructuredIndexDocuments({
        cursor: checkpoint.structuredCursor,
        limit: Math.min(this.options.indexPageSize, remainingBudget),
      });

      if (!page) {
        checkpoint.structuredComplete = true;
      } else {
        remainingBudget -= page.documents.length;

        for (const document of page.documents) {
          const matchingTypes = Array.from(
            new Set(
              Object.keys(document.fields)
                .map((field) => descriptorForField(field)?.typeName)
                .filter((value): value is string => !!value),
            ),
          );

          if (matchingTypes.length === 1) {
            await auditCandidate({
              typeName: matchingTypes[0],
              docId: document.docId,
              source: "structured",
              structuredVersion: document.version,
            });
          } else if (
            Object.keys(document.fields).length > 0 &&
            matchingTypes.length !== 1
          ) {
            suspiciousCount += 1;
            await this.store.createRecord({
              kind: "finding",
              status: "open",
              itemId: document.docId,
              scope: "unscopedStructuredIndex",
              correlationId: runId,
              expiresAt: now + this.options.recordRetentionMs,
              data: {
                findingType: "unscopedStructuredIndex",
                fieldCount: Object.keys(document.fields).length,
              },
            });
          }
        }

        checkpoint.structuredCursor = page.cursor;
        checkpoint.structuredComplete = !page.cursor;
      }
    }

    if (!checkpoint.textComplete && remainingBudget > 0) {
      const page = await this.orm.listTextIndexDocuments({
        cursor: checkpoint.textCursor,
        limit: Math.min(this.options.indexPageSize, remainingBudget),
      });

      if (!page) {
        checkpoint.textComplete = true;
      } else {
        remainingBudget -= page.documents.length;

        for (const document of page.documents) {
          const descriptor = descriptorForField(document.indexField);
          if (descriptor) {
            await auditCandidate({
              typeName: descriptor.typeName,
              docId: document.docId,
              source: "text",
              textIndexFields: [document.indexField],
            });
          } else {
            suspiciousCount += 1;
            await this.store.createRecord({
              kind: "finding",
              status: "open",
              itemId: document.docId,
              scope: "unscopedTextIndex",
              correlationId: runId,
              expiresAt: now + this.options.recordRetentionMs,
              data: {
                findingType: "unscopedTextIndex",
                indexField: document.indexField,
              },
            });
          }
        }

        checkpoint.textCursor = page.cursor;
        checkpoint.textComplete = !page.cursor;
      }
    }

    const retention = await this.pruneExpiredRecords(
      checkpoint.retentionCursor,
      now,
    );
    checkpoint.retentionCursor = retention.cursor;
    const cycleComplete =
      !!checkpoint.structuredComplete && !!checkpoint.textComplete;

    await this.writeCheckpoint(
      cycleComplete
        ? {
            retentionCursor: checkpoint.retentionCursor,
          }
        : checkpoint,
      cycleComplete ? "complete" : "running",
    );

    const result: TypeInfoORMHealthMonitorRunResult = {
      runId,
      repairMode,
      examinedCount,
      orphanFindingCount,
      confirmedOrphanCount,
      repairedCount,
      suspiciousCount,
      expiredRecordCount: retention.deletedCount,
      continuation: !cycleComplete,
    };

    await this.store.updateRecord(runId, {
      status: "complete",
      data: result as unknown as Record<string, unknown>,
    });

    return result;
  };

  private readCheckpoint = async (): Promise<AuditCheckpointData> => {
    const checkpoint = await this.store.readRecord(INDEX_AUDIT_CHECKPOINT_ID);
    const data = checkpoint?.data;

    if (!data || typeof data !== "object") {
      return {};
    }

    return {
      structuredCursor:
        typeof data.structuredCursor === "string"
          ? data.structuredCursor
          : undefined,
      structuredComplete: data.structuredComplete === true,
      textCursor:
        typeof data.textCursor === "string" ? data.textCursor : undefined,
      textComplete: data.textComplete === true,
      retentionCursor:
        typeof data.retentionCursor === "string"
          ? data.retentionCursor
          : undefined,
    };
  };

  private writeCheckpoint = async (
    data: AuditCheckpointData,
    status: HealthRecord["status"],
  ): Promise<void> => {
    await this.store.putRecord(INDEX_AUDIT_CHECKPOINT_ID, {
      kind: "checkpoint",
      status,
      operation: "indexAudit",
      data,
    });
  };

  private pruneExpiredRecords = async (
    cursor: string | undefined,
    now: number,
  ): Promise<{ deletedCount: number; cursor?: string }> => {
    const page = await this.store.listRecords({
      itemsPerPage: this.options.retentionPageSize,
      cursor,
    });
    let deletedCount = 0;

    for (const record of page.records) {
      if (
        record.id !== INDEX_AUDIT_CHECKPOINT_ID &&
        record.expiresAt !== undefined &&
        record.expiresAt <= now
      ) {
        await this.store.deleteRecord(record.id);
        deletedCount += 1;
      }
    }

    return {
      deletedCount,
      cursor: page.cursor,
    };
  };
}
