import type { DocId } from "../Types";
import type { WhereValue } from "./Types";
import type {
  StructuredDocFieldsState,
  StructuredDocFieldsRecord,
  StructuredRangeIndexItem,
  StructuredRangeIndexKey,
  StructuredTermIndexItem,
  StructuredTermIndexKey,
} from "./StructuredIndexRecords";
import {
  buildStructuredRangeItem,
  buildStructuredTermItem,
} from "./StructuredIndexRecords";
import {
  type StructuredStringTokenizerConfig,
  buildStructuredStringContainsTokens,
} from "./StructuredStringLike";
import {
  buildStructuredMissingItems,
  buildStructuredOccupancyItems,
  type StructuredMissingItem,
  type StructuredOccupancyFieldMap,
  type StructuredOccupancyGenerationState,
  type StructuredOccupancyItem,
  type StructuredWriteContext,
} from "./StructuredOccupancy";

/**
 * Dependencies required to persist structured index entries.
 */
export type StructuredWriterDependencies = {
  /**
   * Load previously stored fields for a document.
   * @param docId Document id to load.
   * @returns Stored fields or undefined when missing.
   */
  loadDocFieldsState(
    docId: DocId,
  ): Promise<StructuredDocFieldsState | undefined>;
  /**
   * Compare-and-swap the latest fields for a document.
   * @param docId Document id to store.
   * @param expectedVersion Version expected by the caller.
   * @param fields Structured fields to persist.
   * @returns True when swap succeeds, false on version mismatch.
   */
  putDocFieldsIfVersion(
    docId: DocId,
    expectedVersion: number | undefined,
    fields: StructuredDocFieldsRecord,
    occupancyFields?: StructuredOccupancyFieldMap,
  ): Promise<boolean>;
  /**
   * Store term index entries.
   * @param entries Term entries to store.
   * @returns Promise resolved once stored.
   */
  putTermEntries(entries: StructuredTermIndexItem[]): Promise<void>;
  /**
   * Delete term index entries.
   * @param entries Term entry keys to delete.
   * @returns Promise resolved once deleted.
   */
  deleteTermEntries(entries: StructuredTermIndexKey[]): Promise<void>;
  /**
   * Store range index entries.
   * @param entries Range entries to store.
   * @returns Promise resolved once stored.
   */
  putRangeEntries(entries: StructuredRangeIndexItem[]): Promise<void>;
  /**
   * Delete range index entries.
   * @param entries Range entry keys to delete.
   * @returns Promise resolved once deleted.
   */
  deleteRangeEntries(entries: StructuredRangeIndexKey[]): Promise<void>;
  /** Load active/building occupancy generations. */
  loadOccupancyGenerationState?(): Promise<
    StructuredOccupancyGenerationState | undefined
  >;
  /** Apply all derived structured mutations through one batched coordinator. */
  writeDerivedEntries?(mutation: StructuredDerivedMutation): Promise<void>;
};

/** Complete non-canonical mutation delta produced by one structured write. */
export type StructuredDerivedMutation = {
  putTerms: StructuredTermIndexItem[];
  deleteTerms: StructuredTermIndexKey[];
  putRanges: StructuredRangeIndexItem[];
  deleteRanges: StructuredRangeIndexKey[];
  putOccupancy: StructuredOccupancyItem[];
  putMissing: StructuredMissingItem[];
  deleteMissing: StructuredMissingItem[];
};

type TermEntry = StructuredTermIndexItem;

type RangeEntry = StructuredRangeIndexItem;

export type StructuredWriterOptions = {
  /**
   * Optional tokenizer settings for string contains indexing.
   */
  tokenizer?: Partial<StructuredStringTokenizerConfig>;
  /**
   * Maximum compare-and-swap retries for concurrent writes.
   */
  maxConcurrentWriteRetries?: number;
};

function normalizeFields(
  fields: StructuredDocFieldsRecord,
): StructuredDocFieldsRecord {
  const normalized: StructuredDocFieldsRecord = {};

  for (const [field, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      const unique = Array.from(new Set(value));
      normalized[field] = unique;
    } else {
      normalized[field] = value;
    }
  }

  return normalized;
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => structurallyEqual(entry, right[index]))
    );
  }
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(rightRecord, key) &&
        structurallyEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

function buildTermEntries(
  docId: DocId,
  fields: StructuredDocFieldsRecord,
  options: StructuredWriterOptions,
): TermEntry[] {
  const entries: TermEntry[] = [];

  for (const [field, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      const uniqueValues = new Set<WhereValue>(value);
      for (const entry of uniqueValues) {
        entries.push(buildStructuredTermItem(field, entry, "contains", docId));
      }
    } else {
      entries.push(buildStructuredTermItem(field, value, "eq", docId));
      if (typeof value === "string") {
        for (const token of buildStructuredStringContainsTokens(
          value,
          options.tokenizer,
        )) {
          entries.push(
            buildStructuredTermItem(field, token, "contains", docId),
          );
        }
      }
    }
  }

  return entries;
}

function buildRangeEntries(
  docId: DocId,
  fields: StructuredDocFieldsRecord,
): RangeEntry[] {
  const entries: RangeEntry[] = [];

  for (const [field, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      continue;
    }

    entries.push(buildStructuredRangeItem(field, value, docId));
  }

  return entries;
}

function termEntryKey(entry: TermEntry): string {
  return `${entry.pk}\u0000${entry.sk}`;
}

function rangeEntryKey(entry: RangeEntry): string {
  return `${entry.pk}\u0000${entry.sk}`;
}

function diffEntries<T>(
  previous: T[],
  next: T[],
  keyFn: (entry: T) => string,
): { toAdd: T[]; toDelete: T[] } {
  const previousKeys = new Map(previous.map((entry) => [keyFn(entry), entry]));
  const nextKeys = new Map(next.map((entry) => [keyFn(entry), entry]));

  const toDelete: T[] = [];
  const toAdd: T[] = [];

  for (const [key, entry] of previousKeys) {
    if (!nextKeys.has(key)) {
      toDelete.push(entry);
    }
  }

  for (const [key, entry] of nextKeys) {
    if (!previousKeys.has(key)) {
      toAdd.push(entry);
    }
  }

  return { toAdd, toDelete };
}

function toTermKeys(entries: TermEntry[]): StructuredTermIndexKey[] {
  return entries.map(({ pk, sk }) => ({ pk, sk }));
}

function toRangeKeys(entries: RangeEntry[]): StructuredRangeIndexKey[] {
  return entries.map(({ pk, sk }) => ({ pk, sk }));
}

/**
 * Writer that diffs structured fields and persists term/range entries.
 */
export class StructuredDdbWriter {
  private readonly options: StructuredWriterOptions;
  /**
   * @param dependencies Writer dependencies for persistence.
   */
  constructor(
    private readonly dependencies: StructuredWriterDependencies,
    options: StructuredWriterOptions = {},
  ) {
    this.options = options;
  }

  /**
   * Write structured fields for a document, diffing term/range entries.
   * @param docId Document id to write.
   * @param fields Structured fields to store.
   * @returns Promise resolved once all writes complete.
   */
  async write(
    docId: DocId,
    fields: StructuredDocFieldsRecord,
    context: StructuredWriteContext = {},
  ): Promise<void> {
    const normalized = normalizeFields(fields);
    const maxRetries = this.options.maxConcurrentWriteRetries ?? 8;
    let attempts = 0;

    while (attempts <= maxRetries) {
      const previousState = await this.dependencies.loadDocFieldsState(docId);
      const previousNormalized = previousState
        ? normalizeFields(previousState.fields)
        : {};
      const expectedVersion = previousState?.version;
      const occupancyFields = context.occupancyFields ?? {};

      const previousTerms = buildTermEntries(
        docId,
        previousNormalized,
        this.options,
      );
      const nextTerms = buildTermEntries(docId, normalized, this.options);
      const previousRanges = buildRangeEntries(docId, previousNormalized);
      const nextRanges = buildRangeEntries(docId, normalized);

      const termDiff = diffEntries(previousTerms, nextTerms, termEntryKey);
      const rangeDiff = diffEntries(previousRanges, nextRanges, rangeEntryKey);
      const swapped = await this.dependencies.putDocFieldsIfVersion(
        docId,
        expectedVersion,
        normalized,
        occupancyFields,
      );

      if (!swapped) {
        attempts += 1;
        continue;
      }

      const generationState =
        await this.dependencies.loadOccupancyGenerationState?.();
      const generations = Array.from(
        new Set(
          [
            generationState?.activeGeneration,
            generationState?.buildingGeneration,
          ].filter((value): value is string => !!value),
        ),
      );
      const putOccupancy = generations.flatMap((generation) =>
        buildStructuredOccupancyItems(generation, normalized, occupancyFields),
      );
      const previousMissing = previousState
        ? generations.flatMap((generation) =>
            buildStructuredMissingItems(
              generation,
              docId,
              previousNormalized,
              previousState.occupancyFields ?? occupancyFields,
            ),
          )
        : [];
      const nextMissing = context.deleted
        ? []
        : generations.flatMap((generation) =>
            buildStructuredMissingItems(
              generation,
              docId,
              normalized,
              occupancyFields,
            ),
          );
      const missingDiff = diffEntries(
        previousMissing,
        nextMissing,
        (entry) => `${entry.pk}\u0000${entry.sk}`,
      );
      const mutation: StructuredDerivedMutation = {
        // Re-put the complete next state so an idempotent caller retry repairs
        // additions after a prior partial derived-write failure.
        putTerms: nextTerms,
        deleteTerms: toTermKeys(termDiff.toDelete),
        putRanges: nextRanges,
        deleteRanges: toRangeKeys(rangeDiff.toDelete),
        putOccupancy,
        putMissing: nextMissing,
        deleteMissing: missingDiff.toDelete,
      };

      if (this.dependencies.writeDerivedEntries) {
        await this.dependencies.writeDerivedEntries(mutation);
      } else {
        if (termDiff.toDelete.length > 0) {
          await this.dependencies.deleteTermEntries(
            toTermKeys(termDiff.toDelete),
          );
        }

        if (rangeDiff.toDelete.length > 0) {
          await this.dependencies.deleteRangeEntries(
            toRangeKeys(rangeDiff.toDelete),
          );
        }

        if (nextTerms.length > 0) {
          await this.dependencies.putTermEntries(nextTerms);
        }

        if (nextRanges.length > 0) {
          await this.dependencies.putRangeEntries(nextRanges);
        }
      }

      const confirmed = await this.dependencies.loadDocFieldsState(docId);
      const writtenVersion = (expectedVersion ?? 0) + 1;
      if (
        confirmed?.version === writtenVersion &&
        structurallyEqual(normalizeFields(confirmed.fields), normalized) &&
        structurallyEqual(confirmed.occupancyFields ?? {}, occupancyFields)
      ) {
        return;
      }
      attempts += 1;
    }

    throw new Error("Structured writer concurrent write retries exceeded.");
  }
}
