/**
 * @packageDocumentation
 *
 * Lightweight persistence of noteworthy ORM operation timing observations.
 */
import type {
  TypeInfoORMOperationObservation,
  TypeInfoORMOperationObserver,
  TypeInfoORMService,
} from "../api/ORM/TypeInfoORMService";
import type { HealthStore } from "./Types";

/** Configuration for {@link TypeInfoORMHealthOperationRecorder}. */
export type TypeInfoORMHealthOperationRecorderConfig = {
  /** Health store that receives noteworthy operation records. */
  store: HealthStore;
  /** Minimum successful operation duration to persist. Defaults to 1000 ms. */
  slowOperationMs?: number;
  /** Persist failed operations even when they are faster than the threshold. */
  recordFailures?: boolean;
  /** Raw operation-record retention. Defaults to 24 hours. */
  recordRetentionMs?: number;
  /** Clock used for expiry timestamps. */
  now?: () => number;
};

const DEFAULT_SLOW_OPERATION_MS = 1000;
const DEFAULT_OPERATION_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Record only slow or failed ORM operations into the shared Health store.
 *
 * Fast successful operations are intentionally discarded so ordinary ORM
 * traffic does not create unbounded telemetry volume.
 */
export class TypeInfoORMHealthOperationRecorder {
  private readonly store: HealthStore;
  private readonly slowOperationMs: number;
  private readonly recordFailures: boolean;
  private readonly recordRetentionMs: number;
  private readonly now: () => number;

  /** Observer suitable for TypeInfoORM observability or subscriptions. */
  readonly observe: TypeInfoORMOperationObserver;

  /**
   * @param config Recorder configuration.
   */
  constructor(config: TypeInfoORMHealthOperationRecorderConfig) {
    this.store = config.store;
    this.slowOperationMs = Math.max(
      0,
      config.slowOperationMs ?? DEFAULT_SLOW_OPERATION_MS,
    );
    this.recordFailures = config.recordFailures ?? true;
    this.recordRetentionMs = Math.max(
      1,
      config.recordRetentionMs ?? DEFAULT_OPERATION_RETENTION_MS,
    );
    this.now = config.now ?? Date.now;

    this.observe = async (
      event: TypeInfoORMOperationObservation,
    ): Promise<void> => {
      const slow = event.durationMs >= this.slowOperationMs;
      const failed = !event.success;

      if (!slow && !(failed && this.recordFailures)) {
        return;
      }

      await this.store.createRecord({
        kind: "operation",
        status: "pending",
        typeName: event.typeName,
        operation: event.operation,
        scope: failed ? "failedOperation" : "slowOperation",
        count: event.resultCount,
        value: event.durationMs,
        expiresAt: this.now() + this.recordRetentionMs,
        data: {
          startedAt: event.startedAt,
          durationMs: event.durationMs,
          success: event.success,
          ...(event.resultCount !== undefined
            ? { resultCount: event.resultCount }
            : {}),
          slowOperationMs: this.slowOperationMs,
        },
      });
    };
  }

  /**
   * Attach this recorder to an already-configured ORM instance.
   *
   * @param orm ORM instance whose public operations should be observed.
   * @returns Function that detaches the recorder.
   */
  attach = (orm: TypeInfoORMService): (() => void) =>
    orm.addOperationObserver(this.observe);
}
