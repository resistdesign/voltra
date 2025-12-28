import { decodeStructuredCursor, encodeStructuredCursor } from "./cursor";
import type { DocId } from "../types";
import { compareDocId } from "../docId";
import type { CandidatePage, StructuredQueryOptions, WhereValue } from "./types";

type RangeEntry = {
  value: WhereValue;
  docId: DocId;
};

function insertSortedUnique(values: DocId[], docId: DocId): void {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (compareDocId(values[mid], docId) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  if (values[low] !== docId) {
    values.splice(low, 0, docId);
  }
}

function findStartIndex(values: DocId[], lastDocId?: DocId): number {
  if (lastDocId === undefined) {
    return 0;
  }

  let low = 0;
  let high = values.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (compareDocId(values[mid], lastDocId) <= 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

function compareValues(left: WhereValue, right: WhereValue): number {
  if (left === right) {
    return 0;
  }

  if (left === null || right === null) {
    return left === null ? -1 : 1;
  }

  const leftType = typeof left;
  const rightType = typeof right;

  if (leftType === rightType) {
    if (leftType === 'number') {
      return (left as number) - (right as number);
    }

    if (leftType === 'boolean') {
      return Number(left) - Number(right);
    }

    return String(left).localeCompare(String(right));
  }

  const order = ['number', 'string', 'boolean', 'object'];
  return order.indexOf(leftType) - order.indexOf(rightType);
}

function compareRangeEntry(value: WhereValue, docId: DocId, entry: RangeEntry): number {
  const valueCompare = compareValues(value, entry.value);
  if (valueCompare !== 0) {
    return valueCompare;
  }

  return compareDocId(docId, entry.docId);
}

function insertRangeEntry(entries: RangeEntry[], value: WhereValue, docId: DocId): void {
  let low = 0;
  let high = entries.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (compareRangeEntry(value, docId, entries[mid]) > 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  if (entries[low]?.docId !== docId || compareValues(entries[low]?.value ?? value, value) !== 0) {
    entries.splice(low, 0, {value, docId});
  }
}

function lowerBound(entries: RangeEntry[], value: WhereValue): number {
  let low = 0;
  let high = entries.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (compareValues(entries[mid].value, value) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

function upperBound(entries: RangeEntry[], value: WhereValue): number {
  let low = 0;
  let high = entries.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (compareValues(entries[mid].value, value) <= 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

function paginate(docIds: DocId[], options: StructuredQueryOptions = {}): CandidatePage {
  const cursorState = decodeStructuredCursor(options.cursor);
  const startIndex = findStartIndex(docIds, cursorState?.lastDocId);
  const limit = options.limit ?? docIds.length;
  const candidateIds = docIds.slice(startIndex, startIndex + limit);

  if (startIndex + limit < docIds.length && candidateIds.length > 0) {
    return {
      candidateIds,
      cursor: encodeStructuredCursor({lastDocId: candidateIds[candidateIds.length - 1]}),
    };
  }

  return {candidateIds};
}

function addPosting(
  index: Map<string, Map<WhereValue, DocId[]>>,
  field: string,
  value: WhereValue,
  docId: DocId,
): void {
  const fieldIndex = index.get(field) ?? new Map<WhereValue, DocId[]>();
  const postings = fieldIndex.get(value) ?? [];
  insertSortedUnique(postings, docId);
  fieldIndex.set(value, postings);
  index.set(field, fieldIndex);
}

export class StructuredInMemoryIndex {
  private eqIndex = new Map<string, Map<WhereValue, DocId[]>>();
  private containsIndex = new Map<string, Map<WhereValue, DocId[]>>();
  private rangeIndex = new Map<string, RangeEntry[]>();

  addDocument(docId: DocId, record: Record<string, WhereValue | WhereValue[]>): void {
    for (const [field, value] of Object.entries(record)) {
      if (Array.isArray(value)) {
        const uniqueValues = new Set(value);
        for (const entry of uniqueValues) {
          addPosting(this.containsIndex, field, entry, docId);
        }
        continue;
      }

      addPosting(this.eqIndex, field, value, docId);
      const entries = this.rangeIndex.get(field) ?? [];
      insertRangeEntry(entries, value, docId);
      this.rangeIndex.set(field, entries);
    }
  }

  eq(field: string, value: WhereValue, options: StructuredQueryOptions = {}): CandidatePage {
    const docIds = this.eqIndex.get(field)?.get(value) ?? [];
    return paginate(docIds, options);
  }

  contains(field: string, value: WhereValue, options: StructuredQueryOptions = {}): CandidatePage {
    const docIds = this.containsIndex.get(field)?.get(value) ?? [];
    return paginate(docIds, options);
  }

  between(
    field: string,
    lower: WhereValue,
    upper: WhereValue,
    options: StructuredQueryOptions = {},
  ): CandidatePage {
    const entries = this.rangeIndex.get(field) ?? [];
    const start = lowerBound(entries, lower);
    const end = upperBound(entries, upper);
    const docIds = entries.slice(start, end).map((entry) => entry.docId).sort(compareDocId);
    return paginate(docIds, options);
  }

  gte(field: string, lower: WhereValue, options: StructuredQueryOptions = {}): CandidatePage {
    const entries = this.rangeIndex.get(field) ?? [];
    const start = lowerBound(entries, lower);
    const docIds = entries.slice(start).map((entry) => entry.docId).sort(compareDocId);
    return paginate(docIds, options);
  }

  lte(field: string, upper: WhereValue, options: StructuredQueryOptions = {}): CandidatePage {
    const entries = this.rangeIndex.get(field) ?? [];
    const end = upperBound(entries, upper);
    const docIds = entries.slice(0, end).map((entry) => entry.docId).sort(compareDocId);
    return paginate(docIds, options);
  }
}
