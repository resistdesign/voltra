import type { DocId } from '../types.js';
import type { WhereValue } from './types.js';
import type {
  StructuredDocFieldsRecord,
  StructuredRangeIndexItem,
  StructuredRangeIndexKey,
  StructuredTermIndexItem,
  StructuredTermIndexKey,
} from './structuredDdb.js';
import {
  buildStructuredRangeItem,
  buildStructuredTermItem,
} from './structuredDdb.js';

/**
 * Dependencies required to persist structured index entries.
 */
export type StructuredWriterDependencies = {
  /**
   * Load previously stored fields for a document.
   * @param docId Document id to load.
   * @returns Stored fields or undefined when missing.
   */
  loadDocFields(docId: DocId): Promise<StructuredDocFieldsRecord | undefined>;
  /**
   * Store the latest fields for a document.
   * @param docId Document id to store.
   * @param fields Structured fields to persist.
   * @returns Promise resolved once stored.
   */
  putDocFields(docId: DocId, fields: StructuredDocFieldsRecord): Promise<void>;
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

function normalizeFields(fields: StructuredDocFieldsRecord): StructuredDocFieldsRecord {
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

function buildTermEntries(docId: DocId, fields: StructuredDocFieldsRecord): TermEntry[] {
  const entries: TermEntry[] = [];

  for (const [field, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      const uniqueValues = new Set<WhereValue>(value);
      for (const entry of uniqueValues) {
        entries.push(buildStructuredTermItem(field, entry, 'contains', docId));
      }
    } else {
      entries.push(buildStructuredTermItem(field, value, 'eq', docId));
    }
  }

  return entries;
}

function buildRangeEntries(docId: DocId, fields: StructuredDocFieldsRecord): RangeEntry[] {
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
  return `${entry.termKey}#${entry.docId}`;
}

function rangeEntryKey(entry: RangeEntry): string {
  return `${entry.field}#${entry.rangeKey}`;
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
  return entries.map((entry) => ({ termKey: entry.termKey, docId: entry.docId }));
}

function toRangeKeys(entries: RangeEntry[]): StructuredRangeIndexKey[] {
  return entries.map((entry) => ({ field: entry.field, rangeKey: entry.rangeKey }));
}

/**
 * Writer that diffs structured fields and persists term/range entries.
 */
export class StructuredDdbWriter {
  /**
   * @param dependencies Writer dependencies for persistence.
   */
  constructor(private readonly dependencies: StructuredWriterDependencies) {}

  /**
   * Write structured fields for a document, diffing term/range entries.
   * @param docId Document id to write.
   * @param fields Structured fields to store.
   * @returns Promise resolved once all writes complete.
   */
  async write(docId: DocId, fields: StructuredDocFieldsRecord): Promise<void> {
    const normalized = normalizeFields(fields);
    const previousFields = await this.dependencies.loadDocFields(docId);
    const previousNormalized = previousFields ? normalizeFields(previousFields) : {};

    const previousTerms = buildTermEntries(docId, previousNormalized);
    const nextTerms = buildTermEntries(docId, normalized);
    const previousRanges = buildRangeEntries(docId, previousNormalized);
    const nextRanges = buildRangeEntries(docId, normalized);

    const termDiff = diffEntries(previousTerms, nextTerms, termEntryKey);
    const rangeDiff = diffEntries(previousRanges, nextRanges, rangeEntryKey);

    if (termDiff.toDelete.length > 0) {
      await this.dependencies.deleteTermEntries(toTermKeys(termDiff.toDelete));
    }

    if (rangeDiff.toDelete.length > 0) {
      await this.dependencies.deleteRangeEntries(toRangeKeys(rangeDiff.toDelete));
    }

    if (termDiff.toAdd.length > 0) {
      await this.dependencies.putTermEntries(termDiff.toAdd);
    }

    if (rangeDiff.toAdd.length > 0) {
      await this.dependencies.putRangeEntries(rangeDiff.toAdd);
    }

    await this.dependencies.putDocFields(docId, normalized);
  }
}
