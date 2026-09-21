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
import { DATA_ITEM_DB_DRIVER_ERRORS } from "../api/ORM/drivers/common/Types";
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

/** Bounded options for reading persisted Health status. */
export type TypeInfoORMHealthStatusOptions = {
  /** Maximum Health records summarized in one page. Defaults to 100. */
  itemsPerPage?: number;
  /** Opaque Health-store continuation token. */
  cursor?: string;
};

/** One bounded page of persisted Health status counts. */
export type TypeInfoORMHealthStatusResult = {
  /** Health records examined in this page. */
  examinedRecordCount: number;
  /** Open findings requiring attention or further confirmation. */
  openFindingCount: number;
  /** Confirmed findings not yet marked repaired/dismissed. */
  confirmedFindingCount: number;
  /** Findings already repaired. */
  repairedFindingCount: number;
  /** Pending raw operation observations awaiting compaction. */
  pendingOperationCount: number;
  /** Compacted statistics records retained by Health. */
  statsRecordCount: number;
  /** Repair history records retained by Health. */
  repairRecordCount: number;
  /** Failed Health runs retained in this page. */
  failedRunCount: number;
  /** Opaque continuation token when more Health records remain. */
  cursor?: string;
  /** True when additional persisted Health records remain. */
  continuation: boolean;
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
  /** Guarded orphan/removed-type repairs completed. */
  repairedCount: number;
  /** Index-relevant TypeInfo schema changes observed. */
  schemaDriftFindingCount: number;
  /** Schema changes confirmed across repeated monitor runs. */
  confirmedSchemaDriftCount: number;
  /** Canonical items reconciled to the confirmed current schema. */
  schemaReconciledItemCount: number;
  /** Canonical items found with missing or mismatched current index state. */
  missingIndexFindingCount: number;
  /** Canonical items reindexed from fresh stored state during this run. */
  reindexedItemCount: number;
  /** Persisted slow-operation records promoted to Health findings. */
  slowOperationFindingCount: number;
  /** Persisted failed-operation records promoted to Health findings. */
  failedOperationFindingCount: number;
  /** Raw operation records consumed during this bounded pass. */
  operationRecordsProcessedCount: number;
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
  /** Maximum canonical items reindexed for schema reconciliation in one run. */
  maxSchemaItemsPerRun?: number;
  /** Maximum canonical items inspected for missing indexes in one run. */
  maxCanonicalItemsPerRun?: number;
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
  schemaSignature?: string;
  schemaTypeName?: string;
  schemaCursor?: string;
  schemaReconcileComplete?: boolean;
  canonicalTypeName?: string;
  canonicalCursor?: string;
  canonicalComplete?: boolean;
};

type AuditSource = "structured" | "text";

type AuditCandidate = {
  typeName: string;
  docId: DocId;
  source: AuditSource;
  structuredVersion?: number;
  textIndexFields?: string[];
};

type SchemaDriftState = {
  baselineDescriptors: TypeInfoORMIndexMaintenanceTypeDescriptor[];
  currentDescriptors: TypeInfoORMIndexMaintenanceTypeDescriptor[];
  signature: string;
  changedTypeNames: string[];
  removedDescriptors: TypeInfoORMIndexMaintenanceTypeDescriptor[];
  findingCount: number;
  confirmedCount: number;
  confirmed: boolean;
};

const INDEX_AUDIT_CHECKPOINT_ID = "health:index-audit";
const INDEX_SCHEMA_BASELINE_ID = "health:index-schema:baseline";
const INDEX_SCHEMA_CANDIDATE_ID = "health:index-schema:candidate";
const DEFAULT_RECORD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const identityKey = (typeName: string, docId: DocId): string =>
  JSON.stringify([typeName, typeof docId, docId]);

const findingId = (typeName: string, docId: DocId): string =>
  `health:finding:orphan:${encodeURIComponent(typeName)}:${encodeURIComponent(
    JSON.stringify([typeof docId, docId]),
  )}`;

const compactHealthKeyHash = (value: string): string => {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193);
    right = Math.imul(right ^ code, 0x85ebca6b);
  }

  return `${(left >>> 0).toString(16).padStart(8, "0")}${(
    right >>> 0
  )
    .toString(16)
    .padStart(8, "0")}`;
};

const operationStatsIdentity = (record: HealthRecord): string =>
  JSON.stringify([
    record.typeName ?? "",
    record.operation ?? "",
    typeof record.data?.queryFingerprint === "string"
      ? record.data.queryFingerprint
      : "",
  ]);

const operationStatsId = (record: HealthRecord): string =>
  `health:stats:operation:${compactHealthKeyHash(
    operationStatsIdentity(record),
  )}`;

const operationFindingId = (statsId: string): string =>
  `health:finding:operation:${statsId.slice("health:stats:operation:".length)}`;

const schemaFindingId = (typeName: string): string =>
  `health:finding:schema:${encodeURIComponent(typeName)}`;

const missingIndexFindingId = (
  typeName: string,
  primaryFieldValue: string | number | boolean | null,
): string =>
  `health:finding:missing-index:${encodeURIComponent(
    typeName,
  )}:${compactHealthKeyHash(
    JSON.stringify([typeof primaryFieldValue, primaryFieldValue]),
  )}`;

const inspectionCapabilityFindingId = (
  typeName: string,
  capability: "structured" | "text",
): string =>
  `health:finding:index-inspection:${encodeURIComponent(
    typeName,
  )}:${capability}`;

const schemaSignature = (
  descriptors: TypeInfoORMIndexMaintenanceTypeDescriptor[],
): string =>
  JSON.stringify(
    descriptors
      .map((descriptor) => [descriptor.typeName, descriptor.indexFingerprint])
      .sort(([left], [right]) =>
        String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0,
      ),
  );

const readDescriptorData = (
  value: unknown,
): TypeInfoORMIndexMaintenanceTypeDescriptor[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is TypeInfoORMIndexMaintenanceTypeDescriptor => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    const record = entry as Record<string, unknown>;
    return (
      typeof record.typeName === "string" &&
      typeof record.primaryField === "string" &&
      typeof record.qualifiedFieldPrefix === "string" &&
      typeof record.indexFingerprint === "string" &&
      Array.isArray(record.structuredFields) &&
      Array.isArray(record.textFields)
    );
  });
};

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
      maxSchemaItemsPerRun: Math.max(1, config.maxSchemaItemsPerRun ?? 100),
      maxCanonicalItemsPerRun: Math.max(
        1,
        config.maxCanonicalItemsPerRun ?? 100,
      ),
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

  /**
   * Read one bounded page of persisted Health status without running audits.
   *
   * @param options Bounded Health-store paging options.
   * @returns Page-local Health counts and continuation state.
   */
  status = async (
    options: TypeInfoORMHealthStatusOptions = {},
  ): Promise<TypeInfoORMHealthStatusResult> => {
    const page = await this.store.listRecords({
      itemsPerPage: Math.max(1, options.itemsPerPage ?? 100),
      cursor: options.cursor,
    });

    let openFindingCount = 0;
    let confirmedFindingCount = 0;
    let repairedFindingCount = 0;
    let pendingOperationCount = 0;
    let statsRecordCount = 0;
    let repairRecordCount = 0;
    let failedRunCount = 0;

    for (const record of page.records) {
      if (record.kind === "finding") {
        if (record.status === "open") {
          openFindingCount += 1;
        } else if (record.status === "confirmed") {
          confirmedFindingCount += 1;
        } else if (record.status === "repaired") {
          repairedFindingCount += 1;
        }
      }

      if (record.kind === "operation" && record.status === "pending") {
        pendingOperationCount += 1;
      }
      if (record.kind === "stats") {
        statsRecordCount += 1;
      }
      if (record.kind === "repair") {
        repairRecordCount += 1;
      }
      if (record.kind === "run" && record.status === "failed") {
        failedRunCount += 1;
      }
    }

    return {
      examinedRecordCount: page.records.length,
      openFindingCount,
      confirmedFindingCount,
      repairedFindingCount,
      pendingOperationCount,
      statsRecordCount,
      repairRecordCount,
      failedRunCount,
      cursor: page.cursor,
      continuation: !!page.cursor,
    };
  };

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
    try {
      const checkpoint = await this.readCheckpoint();
      const schemaState = await this.evaluateSchemaDrift(now, runId);

    if (checkpoint.schemaSignature !== schemaState.signature) {
      checkpoint.schemaSignature = schemaState.signature;
      checkpoint.schemaTypeName = undefined;
      checkpoint.schemaCursor = undefined;
      checkpoint.schemaReconcileComplete = false;
      checkpoint.canonicalTypeName = undefined;
      checkpoint.canonicalCursor = undefined;
      checkpoint.canonicalComplete = false;
    }

    let examinedCount = 0;
    let orphanFindingCount = 0;
    let confirmedOrphanCount = 0;
    let repairedCount = 0;
    let schemaReconciledItemCount = 0;
    let missingIndexFindingCount = 0;
    let reindexedItemCount = 0;
    let suspiciousCount = 0;
    let repairDeferred = false;
    let remainingBudget = this.options.maxIndexDocumentsPerRun;

    if (
      schemaState.confirmed &&
      repairMode === "apply" &&
      !checkpoint.schemaReconcileComplete
    ) {
      const baselineByType = new Map(
        schemaState.baselineDescriptors.map((descriptor) => [
          descriptor.typeName,
          descriptor,
        ]),
      );
      const currentByType = new Map(
        schemaState.currentDescriptors.map((descriptor) => [
          descriptor.typeName,
          descriptor,
        ]),
      );
      const typesToReconcile = schemaState.changedTypeNames.filter((typeName) =>
        currentByType.has(typeName),
      );
      let remainingSchemaBudget = this.options.maxSchemaItemsPerRun;
      let typeIndex = checkpoint.schemaTypeName
        ? Math.max(0, typesToReconcile.indexOf(checkpoint.schemaTypeName))
        : 0;

      if (
        checkpoint.schemaTypeName &&
        !typesToReconcile.includes(checkpoint.schemaTypeName)
      ) {
        checkpoint.schemaTypeName = undefined;
        checkpoint.schemaCursor = undefined;
        typeIndex = 0;
      }

      while (
        typeIndex < typesToReconcile.length &&
        remainingSchemaBudget > 0
      ) {
        const typeName = typesToReconcile[typeIndex];
        const page = await this.orm.reconcileStoredTypeIndexesPage(typeName, {
          previousDescriptor: baselineByType.get(typeName),
          itemsPerPage: Math.min(
            this.options.indexPageSize,
            remainingSchemaBudget,
          ),
          cursor:
            checkpoint.schemaTypeName === typeName
              ? checkpoint.schemaCursor
              : undefined,
        });

        schemaReconciledItemCount += page.processedCount;
        remainingSchemaBudget -= page.processedCount;

        if (page.cursor) {
          checkpoint.schemaTypeName = typeName;
          checkpoint.schemaCursor = page.cursor;
          break;
        }

        typeIndex += 1;
        checkpoint.schemaTypeName = typesToReconcile[typeIndex];
        checkpoint.schemaCursor = undefined;
      }

      checkpoint.schemaReconcileComplete =
        typeIndex >= typesToReconcile.length;
    } else if (!schemaState.confirmed) {
      checkpoint.schemaReconcileComplete =
        schemaState.findingCount === 0;
    }

    const auditCandidate = async (candidate: AuditCandidate): Promise<void> => {
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
        if (
          repairMode === "apply" &&
          confirmed &&
          repairedCount >= this.options.maxRepairsPerRun
        ) {
          repairDeferred = true;
        }
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
    ):
      | {
          descriptor: TypeInfoORMIndexMaintenanceTypeDescriptor;
          removed: boolean;
        }
      | undefined => {
      const currentMatches = this.descriptors.filter((descriptor) =>
        field.startsWith(descriptor.qualifiedFieldPrefix),
      );
      if (currentMatches.length === 1) {
        return { descriptor: currentMatches[0], removed: false };
      }

      const removedMatches = schemaState.removedDescriptors.filter(
        (descriptor) => field.startsWith(descriptor.qualifiedFieldPrefix),
      );
      return removedMatches.length === 1
        ? { descriptor: removedMatches[0], removed: true }
        : undefined;
    };

    const auditRemovedTypeCandidate = async (
      descriptor: TypeInfoORMIndexMaintenanceTypeDescriptor,
      candidate: Omit<AuditCandidate, "typeName">,
    ): Promise<void> => {
      examinedCount += 1;

      await this.store.putRecord(
        `health:finding:removed-type-index:${encodeURIComponent(
          descriptor.typeName,
        )}:${encodeURIComponent(
          JSON.stringify([typeof candidate.docId, candidate.docId]),
        )}`,
        {
          kind: "finding",
          status: schemaState.confirmed ? "confirmed" : "open",
          typeName: descriptor.typeName,
          itemId: candidate.docId,
          scope: "removedTypeIndex",
          correlationId: runId,
          expiresAt: now + this.options.recordRetentionMs,
          data: {
            findingType: "removedTypeIndex",
            source: candidate.source,
            ...(candidate.structuredVersion !== undefined
              ? { structuredVersion: candidate.structuredVersion }
              : {}),
            ...(candidate.textIndexFields
              ? { textIndexFields: candidate.textIndexFields }
              : {}),
          },
        },
      );

      if (
        repairMode !== "apply" ||
        !schemaState.confirmed ||
        repairedCount >= this.options.maxRepairsPerRun
      ) {
        if (repairMode === "apply" && schemaState.confirmed) {
          repairDeferred = true;
        }
        return;
      }

      const cleanup = await this.orm.cleanupRemovedTypeIndexState(
        candidate.docId,
        {
          previousDescriptor: descriptor,
          structuredVersion: candidate.structuredVersion,
          textIndexFields: candidate.textIndexFields,
        },
      );

      await this.store.createRecord({
        kind: "repair",
        status: cleanup.status === "cleaned" ? "repaired" : "open",
        typeName: descriptor.typeName,
        itemId: candidate.docId,
        operation: "removedTypeIndexCleanup",
        correlationId: runId,
        expiresAt: now + this.options.recordRetentionMs,
        data: cleanup,
      });

      if (cleanup.status === "cleaned") {
        repairedCount += 1;
      } else {
        suspiciousCount += 1;
        repairDeferred = true;
      }
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
          const scopedMatches = Object.keys(document.fields)
            .map((field) => descriptorForField(field))
            .filter(
              (
                value,
              ): value is {
                descriptor: TypeInfoORMIndexMaintenanceTypeDescriptor;
                removed: boolean;
              } => !!value,
            );
          const uniqueMatches = Array.from(
            new Map(
              scopedMatches.map((match) => [
                `${match.removed ? "removed" : "current"}:${
                  match.descriptor.typeName
                }`,
                match,
              ]),
            ).values(),
          );

          if (uniqueMatches.length === 1) {
            const match = uniqueMatches[0];
            if (match.removed) {
              await auditRemovedTypeCandidate(match.descriptor, {
                docId: document.docId,
                source: "structured",
                structuredVersion: document.version,
              });
            } else {
              await auditCandidate({
                typeName: match.descriptor.typeName,
                docId: document.docId,
                source: "structured",
                structuredVersion: document.version,
              });
            }
          } else if (
            Object.keys(document.fields).length > 0 &&
            uniqueMatches.length !== 1
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
          const match = descriptorForField(document.indexField);
          if (match?.removed) {
            await auditRemovedTypeCandidate(match.descriptor, {
              docId: document.docId,
              source: "text",
              textIndexFields: [document.indexField],
            });
          } else if (match) {
            await auditCandidate({
              typeName: match.descriptor.typeName,
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

    if (schemaState.findingCount === 0 && !checkpoint.canonicalComplete) {
      const typeNames = this.descriptors.map((descriptor) => descriptor.typeName);
      let remainingCanonicalBudget = this.options.maxCanonicalItemsPerRun;
      let typeIndex = checkpoint.canonicalTypeName
        ? Math.max(0, typeNames.indexOf(checkpoint.canonicalTypeName))
        : 0;

      if (
        checkpoint.canonicalTypeName &&
        !typeNames.includes(checkpoint.canonicalTypeName)
      ) {
        checkpoint.canonicalTypeName = undefined;
        checkpoint.canonicalCursor = undefined;
        typeIndex = 0;
      }

      while (
        typeIndex < typeNames.length &&
        remainingCanonicalBudget > 0
      ) {
        const typeName = typeNames[typeIndex];
        const pageStartCursor =
          checkpoint.canonicalTypeName === typeName
            ? checkpoint.canonicalCursor
            : undefined;
        const page = await this.orm.inspectStoredTypeIndexesPage(typeName, {
          itemsPerPage: Math.min(
            this.options.indexPageSize,
            remainingCanonicalBudget,
          ),
          cursor: pageStartCursor,
        });
        remainingCanonicalBudget -= page.processedCount;

        for (const capability of page.unsupportedCapabilities) {
          suspiciousCount += 1;
          await this.store.putRecord(
            inspectionCapabilityFindingId(typeName, capability),
            {
              kind: "finding",
              status: "open",
              typeName,
              scope: "indexInspectionUnsupported",
              correlationId: runId,
              expiresAt: now + this.options.recordRetentionMs,
              data: {
                findingType: "indexInspectionUnsupported",
                capability,
              },
            },
          );
        }

        let deferredInPage = false;

        for (const unhealthy of page.unhealthyItems) {
          const healthItemId =
            typeof unhealthy.primaryFieldValue === "number"
              ? unhealthy.primaryFieldValue
              : String(unhealthy.primaryFieldValue);
          const currentFindingId = missingIndexFindingId(
            typeName,
            unhealthy.primaryFieldValue,
          );
          const verification =
            await this.orm.verifyStoredItemIndexesForMaintenance(
              typeName,
              unhealthy.primaryFieldValue,
            );

          if (!verification.exists) {
            await this.store.putRecord(currentFindingId, {
              kind: "finding",
              status: "open",
              typeName,
              itemId: healthItemId,
              scope: "canonicalIndexMismatch",
              correlationId: runId,
              expiresAt: now + this.options.recordRetentionMs,
              data: {
                findingType: "canonicalIndexMismatch",
                concurrentCanonicalDelete: true,
              },
            });
            continue;
          }

          if (verification.issues.length === 0) {
            const existing = await this.store.readRecord(currentFindingId);
            if (existing) {
              await this.store.updateRecord(currentFindingId, {
                status: "dismissed",
                correlationId: runId,
              });
            }
            continue;
          }

          missingIndexFindingCount += 1;
          const stronglyConfirmed = verification.consistency === "strong";
          await this.store.putRecord(currentFindingId, {
            kind: "finding",
            status: stronglyConfirmed ? "confirmed" : "open",
            typeName,
            itemId: healthItemId,
            scope: "canonicalIndexMismatch",
            correlationId: runId,
            expiresAt: now + this.options.recordRetentionMs,
            data: {
              findingType: "canonicalIndexMismatch",
              issues: verification.issues,
              consistency: verification.consistency,
              unsupportedCapabilities: verification.unsupportedCapabilities,
            },
          });

          if (!stronglyConfirmed) {
            suspiciousCount += 1;
            continue;
          }

          if (repairMode !== "apply") {
            continue;
          }

          if (
            repairedCount + reindexedItemCount >=
            this.options.maxRepairsPerRun
          ) {
            repairDeferred = true;
            deferredInPage = true;
            continue;
          }

          try {
            await this.orm.reindexStoredItem(
              typeName,
              unhealthy.primaryFieldValue,
            );

            const postRepair =
              await this.orm.verifyStoredItemIndexesForMaintenance(
                typeName,
                unhealthy.primaryFieldValue,
              );

            if (
              postRepair.exists &&
              postRepair.consistency === "strong" &&
              postRepair.issues.length === 0
            ) {
              reindexedItemCount += 1;
              await this.store.updateRecord(currentFindingId, {
                status: "repaired",
                correlationId: runId,
                data: {
                  findingType: "canonicalIndexMismatch",
                  issues: verification.issues,
                  consistency: verification.consistency,
                  postRepairVerified: true,
                },
              });
            } else {
              suspiciousCount += 1;
              repairDeferred = true;
              deferredInPage = true;
              await this.store.updateRecord(currentFindingId, {
                status: "open",
                correlationId: runId,
                data: {
                  findingType: "canonicalIndexMismatch",
                  issues: postRepair.issues,
                  consistency: postRepair.consistency,
                  postRepairVerified: false,
                  concurrentCanonicalDelete: !postRepair.exists,
                },
              });
            }
          } catch (error: any) {
            if (error?.message === DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND) {
              await this.store.updateRecord(currentFindingId, {
                status: "open",
                correlationId: runId,
                data: {
                  findingType: "canonicalIndexMismatch",
                  issues: verification.issues,
                  concurrentCanonicalDelete: true,
                },
              });
              continue;
            }

            throw error;
          }
        }

        if (deferredInPage) {
          checkpoint.canonicalTypeName = typeName;
          checkpoint.canonicalCursor = pageStartCursor;
          break;
        }

        if (page.cursor && page.cursor === pageStartCursor) {
          suspiciousCount += 1;
          await this.store.putRecord(
            inspectionCapabilityFindingId(typeName, "structured"),
            {
              kind: "finding",
              status: "open",
              typeName,
              scope: "canonicalAuditNonProgress",
              correlationId: runId,
              expiresAt: now + this.options.recordRetentionMs,
              data: {
                findingType: "canonicalAuditNonProgress",
              },
            },
          );
          typeIndex += 1;
          checkpoint.canonicalTypeName = typeNames[typeIndex];
          checkpoint.canonicalCursor = undefined;
          continue;
        }

        if (page.cursor) {
          checkpoint.canonicalTypeName = typeName;
          checkpoint.canonicalCursor = page.cursor;
          break;
        }

        typeIndex += 1;
        checkpoint.canonicalTypeName = typeNames[typeIndex];
        checkpoint.canonicalCursor = undefined;
      }

      checkpoint.canonicalComplete = typeIndex >= typeNames.length;
    } else if (schemaState.findingCount > 0) {
      checkpoint.canonicalTypeName = undefined;
      checkpoint.canonicalCursor = undefined;
      checkpoint.canonicalComplete = false;
    }

    const retention = await this.inspectHealthRecords(
      checkpoint.retentionCursor,
      now,
      runId,
    );
    checkpoint.retentionCursor = retention.cursor;
    const indexCycleComplete =
      !!checkpoint.structuredComplete && !!checkpoint.textComplete;
    const canonicalCycleComplete =
      schemaState.findingCount > 0 || !!checkpoint.canonicalComplete;
    const schemaRepairComplete =
      schemaState.findingCount === 0 ||
      (repairMode === "apply" &&
        schemaState.confirmed &&
        checkpoint.schemaReconcileComplete === true &&
        indexCycleComplete &&
        !repairDeferred);

    if (schemaState.findingCount > 0 && schemaRepairComplete) {
      await this.store.putRecord(INDEX_SCHEMA_BASELINE_ID, {
        kind: "checkpoint",
        status: "complete",
        operation: "indexSchemaBaseline",
        data: {
          signature: schemaState.signature,
          descriptors: schemaState.currentDescriptors,
        },
      });
      await this.store.deleteRecord(INDEX_SCHEMA_CANDIDATE_ID);

      for (const typeName of schemaState.changedTypeNames) {
        await this.store.updateRecord(schemaFindingId(typeName), {
          status: "repaired",
          correlationId: runId,
        });
      }

      checkpoint.schemaSignature = schemaState.signature;
      checkpoint.schemaTypeName = undefined;
      checkpoint.schemaCursor = undefined;
      checkpoint.schemaReconcileComplete = true;
    }

    if (repairDeferred && indexCycleComplete) {
      checkpoint.structuredCursor = undefined;
      checkpoint.structuredComplete = false;
      checkpoint.textCursor = undefined;
      checkpoint.textComplete = false;
    }

    const continuation =
      !indexCycleComplete ||
      !canonicalCycleComplete ||
      !!retention.cursor ||
      (repairMode === "apply" &&
        schemaState.confirmed &&
        (!checkpoint.schemaReconcileComplete || repairDeferred));

    const preserveSchemaProgress =
      repairMode === "apply" &&
      schemaState.confirmed &&
      schemaState.findingCount > 0 &&
      !schemaRepairComplete;

    await this.writeCheckpoint(
      indexCycleComplete &&
      canonicalCycleComplete &&
      !repairDeferred &&
      !preserveSchemaProgress
        ? {
            retentionCursor: checkpoint.retentionCursor,
            schemaSignature: checkpoint.schemaSignature,
            schemaReconcileComplete: checkpoint.schemaReconcileComplete,
          }
        : checkpoint,
      continuation ? "running" : "complete",
    );

    const result: TypeInfoORMHealthMonitorRunResult = {
      runId,
      repairMode,
      examinedCount,
      orphanFindingCount,
      confirmedOrphanCount,
      repairedCount,
      schemaDriftFindingCount: schemaState.findingCount,
      confirmedSchemaDriftCount: schemaState.confirmedCount,
      schemaReconciledItemCount,
      missingIndexFindingCount,
      reindexedItemCount,
      slowOperationFindingCount: retention.slowOperationFindingCount,
      failedOperationFindingCount: retention.failedOperationFindingCount,
      operationRecordsProcessedCount: retention.operationRecordsProcessedCount,
      suspiciousCount,
      expiredRecordCount: retention.deletedCount,
      continuation,
    };

      await this.store.updateRecord(runId, {
        status: "complete",
        data: result as unknown as Record<string, unknown>,
      });

      return result;
    } catch (error) {
      try {
        await this.store.updateRecord(runId, {
          status: "failed",
          data: { repairMode },
        });
      } catch (_healthStoreError) {
        // Preserve the original monitor failure if Health persistence also fails.
      }

      throw error;
    }
  };

  private evaluateSchemaDrift = async (
    now: number,
    runId: string,
  ): Promise<SchemaDriftState> => {
    const currentDescriptors = this.descriptors;
    const signature = schemaSignature(currentDescriptors);
    const baselineRecord = await this.store.readRecord(INDEX_SCHEMA_BASELINE_ID);

    if (!baselineRecord) {
      await this.store.putRecord(INDEX_SCHEMA_BASELINE_ID, {
        kind: "checkpoint",
        status: "complete",
        operation: "indexSchemaBaseline",
        data: {
          signature,
          descriptors: currentDescriptors,
        },
      });

      return {
        baselineDescriptors: currentDescriptors,
        currentDescriptors,
        signature,
        changedTypeNames: [],
        removedDescriptors: [],
        findingCount: 0,
        confirmedCount: 0,
        confirmed: false,
      };
    }

    const baselineDescriptors = readDescriptorData(
      baselineRecord.data?.descriptors,
    );
    const baselineSignature =
      typeof baselineRecord.data?.signature === "string"
        ? baselineRecord.data.signature
        : schemaSignature(baselineDescriptors);

    if (baselineSignature === signature) {
      const candidate = await this.store.readRecord(INDEX_SCHEMA_CANDIDATE_ID);
      if (candidate) {
        await this.store.deleteRecord(INDEX_SCHEMA_CANDIDATE_ID);
      }

      return {
        baselineDescriptors,
        currentDescriptors,
        signature,
        changedTypeNames: [],
        removedDescriptors: [],
        findingCount: 0,
        confirmedCount: 0,
        confirmed: false,
      };
    }

    const baselineByType = new Map(
      baselineDescriptors.map((descriptor) => [descriptor.typeName, descriptor]),
    );
    const currentByType = new Map(
      currentDescriptors.map((descriptor) => [descriptor.typeName, descriptor]),
    );
    const changedTypeNames = Array.from(
      new Set([...baselineByType.keys(), ...currentByType.keys()]),
    )
      .filter(
        (typeName) =>
          baselineByType.get(typeName)?.indexFingerprint !==
          currentByType.get(typeName)?.indexFingerprint,
      )
      .sort();
    const removedDescriptors = changedTypeNames
      .filter((typeName) => !currentByType.has(typeName))
      .map((typeName) => baselineByType.get(typeName))
      .filter(
        (
          descriptor,
        ): descriptor is TypeInfoORMIndexMaintenanceTypeDescriptor =>
          !!descriptor,
      );

    const candidate = await this.store.readRecord(INDEX_SCHEMA_CANDIDATE_ID);
    const observations =
      candidate?.data?.signature === signature
        ? Math.max(1, candidate.count ?? 1) + 1
        : 1;
    const confirmed = observations >= 2;

    await this.store.putRecord(INDEX_SCHEMA_CANDIDATE_ID, {
      kind: "checkpoint",
      status: confirmed ? "confirmed" : "open",
      operation: "indexSchemaCandidate",
      count: observations,
      data: {
        signature,
        descriptors: currentDescriptors,
      },
    });

    for (const typeName of changedTypeNames) {
      const previousDescriptor = baselineByType.get(typeName);
      const currentDescriptor = currentByType.get(typeName);

      await this.store.putRecord(schemaFindingId(typeName), {
        kind: "finding",
        status: confirmed ? "confirmed" : "open",
        typeName,
        scope: "indexSchemaDrift",
        correlationId: runId,
        expiresAt: now + this.options.recordRetentionMs,
        data: {
          findingType: "indexSchemaDrift",
          change:
            !previousDescriptor
              ? "typeAdded"
              : !currentDescriptor
                ? "typeRemoved"
                : "typeChanged",
          previousDescriptor,
          currentDescriptor,
          observations,
        },
      });
    }

    return {
      baselineDescriptors,
      currentDescriptors,
      signature,
      changedTypeNames,
      removedDescriptors,
      findingCount: changedTypeNames.length,
      confirmedCount: confirmed ? changedTypeNames.length : 0,
      confirmed,
    };
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
      schemaSignature:
        typeof data.schemaSignature === "string"
          ? data.schemaSignature
          : undefined,
      schemaTypeName:
        typeof data.schemaTypeName === "string"
          ? data.schemaTypeName
          : undefined,
      schemaCursor:
        typeof data.schemaCursor === "string"
          ? data.schemaCursor
          : undefined,
      schemaReconcileComplete: data.schemaReconcileComplete === true,
      canonicalTypeName:
        typeof data.canonicalTypeName === "string"
          ? data.canonicalTypeName
          : undefined,
      canonicalCursor:
        typeof data.canonicalCursor === "string"
          ? data.canonicalCursor
          : undefined,
      canonicalComplete: data.canonicalComplete === true,
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

  private inspectHealthRecords = async (
    cursor: string | undefined,
    now: number,
    runId: string,
  ): Promise<{
    deletedCount: number;
    slowOperationFindingCount: number;
    failedOperationFindingCount: number;
    operationRecordsProcessedCount: number;
    cursor?: string;
  }> => {
    const page = await this.store.listRecords({
      itemsPerPage: this.options.retentionPageSize,
      cursor,
    });
    let deletedCount = 0;
    let slowOperationFindingCount = 0;
    let failedOperationFindingCount = 0;
    let operationRecordsProcessedCount = 0;

    for (const record of page.records) {
      if (
        record.id !== INDEX_AUDIT_CHECKPOINT_ID &&
        record.expiresAt !== undefined &&
        record.expiresAt <= now
      ) {
        await this.store.deleteRecord(record.id);
        deletedCount += 1;
        continue;
      }

      if (record.kind !== "operation" || record.status !== "pending") {
        continue;
      }

      const scope =
        record.scope === "failedOperation"
          ? "failedOperation"
          : record.scope === "slowOperation"
            ? "slowOperation"
            : undefined;

      if (!scope) {
        await this.store.deleteRecord(record.id);
        deletedCount += 1;
        continue;
      }

      const statsId = operationStatsId(record);
      const existingStats = await this.store.readRecord(statsId);
      const previousCount = existingStats?.count ?? 0;
      const previousData = existingStats?.data ?? {};
      const durationMs = record.value ?? 0;
      const previousTotalDurationMs =
        typeof previousData.totalDurationMs === "number"
          ? previousData.totalDurationMs
          : 0;
      const previousMaxDurationMs =
        typeof previousData.maxDurationMs === "number"
          ? previousData.maxDurationMs
          : 0;
      const previousFailureCount =
        typeof previousData.failureCount === "number"
          ? previousData.failureCount
          : 0;
      const previousResultCountTotal =
        typeof previousData.resultCountTotal === "number"
          ? previousData.resultCountTotal
          : 0;
      const nextCount = previousCount + 1;
      const queryFingerprint =
        typeof record.data?.queryFingerprint === "string"
          ? record.data.queryFingerprint
          : undefined;
      const startedAt =
        typeof record.data?.startedAt === "number"
          ? record.data.startedAt
          : undefined;
      const resultCount =
        typeof record.data?.resultCount === "number"
          ? record.data.resultCount
          : undefined;

      await this.store.putRecord(statsId, {
        kind: "stats",
        status: "complete",
        typeName: record.typeName,
        operation: record.operation,
        scope: "operationStats",
        correlationId: runId,
        count: nextCount,
        value: Math.max(previousMaxDurationMs, durationMs),
        expiresAt: now + this.options.recordRetentionMs,
        data: {
          aggregationIdentity: operationStatsIdentity(record),
          ...(queryFingerprint ? { queryFingerprint } : {}),
          totalDurationMs: previousTotalDurationMs + durationMs,
          maxDurationMs: Math.max(previousMaxDurationMs, durationMs),
          lastDurationMs: durationMs,
          failureCount:
            previousFailureCount + (scope === "failedOperation" ? 1 : 0),
          resultCountTotal:
            previousResultCountTotal + (resultCount ?? 0),
          ...(startedAt !== undefined ? { lastStartedAt: startedAt } : {}),
        },
      });

      await this.store.putRecord(operationFindingId(statsId), {
        kind: "finding",
        status: "confirmed",
        typeName: record.typeName,
        operation: record.operation,
        scope,
        correlationId: runId,
        count: nextCount,
        value: Math.max(previousMaxDurationMs, durationMs),
        expiresAt: now + this.options.recordRetentionMs,
        data: {
          findingType: scope,
          statsRecordId: statsId,
          ...(queryFingerprint ? { queryFingerprint } : {}),
          sampleCount: nextCount,
          totalDurationMs: previousTotalDurationMs + durationMs,
          maxDurationMs: Math.max(previousMaxDurationMs, durationMs),
          failureCount:
            previousFailureCount + (scope === "failedOperation" ? 1 : 0),
        },
      });

      await this.store.deleteRecord(record.id);
      deletedCount += 1;
      operationRecordsProcessedCount += 1;

      if (scope === "failedOperation") {
        failedOperationFindingCount += 1;
      } else {
        slowOperationFindingCount += 1;
      }
    }

    return {
      deletedCount,
      slowOperationFindingCount,
      failedOperationFindingCount,
      operationRecordsProcessedCount,
      cursor: page.cursor,
    };
  };
}
