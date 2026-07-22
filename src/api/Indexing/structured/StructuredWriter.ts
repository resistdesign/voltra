import type { DocId } from "../Types";
import type { WhereValue } from "./Types";
import type {
  StructuredDocFieldsState,
  StructuredDocFieldsRecord,
  StructuredRangeIndexItem,
  StructuredRangeIndexKey,
  StructuredTermIndexItem,
  StructuredTermIndexKey,
} from "./StructuredDdb";
import {
  buildStructuredRangeItem,
  buildStructuredTermItem,
} from "./StructuredDdb";
import {
  type StructuredStringTokenizerConfig,
  buildStructuredStringContainsTokens,
} from "./StructuredStringLike";

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
  async write(docId: DocId, fields: StructuredDocFieldsRecord): Promise<void> {
    const normalized = normalizeFields(fields);
    const maxRetries = this.options.maxConcurrentWriteRetries ?? 8;
    let attempts = 0;

    while (attempts <= maxRetries) {
      const previousState = await this.dependencies.loadDocFieldsState(docId);
      const previousNormalized = previousState
        ? normalizeFields(previousState.fields)
        : {};
      const expectedVersion = previousState?.version;

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
      const noDiff =
        termDiff.toAdd.length === 0 &&
        termDiff.toDelete.length === 0 &&
        rangeDiff.toAdd.length === 0 &&
        rangeDiff.toDelete.length === 0;

      if (noDiff) {
        return;
      }

      const swapped = await this.dependencies.putDocFieldsIfVersion(
        docId,
        expectedVersion,
        normalized,
      );

      if (!swapped) {
        attempts += 1;
        continue;
      }

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

      if (termDiff.toAdd.length > 0) {
        await this.dependencies.putTermEntries(termDiff.toAdd);
      }

      if (rangeDiff.toAdd.length > 0) {
        await this.dependencies.putRangeEntries(rangeDiff.toAdd);
      }

      return;
    }

    throw new Error("Structured writer concurrent write retries exceeded.");
  }
}
