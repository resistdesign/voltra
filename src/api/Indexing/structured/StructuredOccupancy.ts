/**
 * @packageDocumentation
 *
 * Versioned chunk, occupancy, missing-value, and generation contracts used by
 * Link & Lock structured pagination.
 */
import type { DocId } from "../Types";
import {
  INDEX_ITEM_KINDS,
  INDEX_KEY_PARTS,
  INDEX_KEY_SEPARATOR,
  assertIndexSortKey,
  assertIndexTableKey,
  buildIndexDocumentSortKey,
  buildIndexKey,
  encodeSortableIndexNumber,
  encodeSortableIndexValue,
  type IndexTableKey,
} from "../IndexTable";
import type { StructuredDocFieldsRecord } from "./StructuredDdb";
import type { WhereValue } from "./Types";

/** Initial occupancy generation used before an explicit rebuild. */
export const INITIAL_STRUCTURED_OCCUPANCY_GENERATION = "g1";
/** Maximum occupancy cells consumed while constructing one skip plan. */
export const STRUCTURED_OCCUPANCY_CELL_BUDGET = 2_000;
/** Maximum backend pages consumed while constructing one skip plan. */
export const STRUCTURED_OCCUPANCY_PAGE_BUDGET = 32;
/** Backend page size used for sparse occupancy reads. */
export const STRUCTURED_OCCUPANCY_PAGE_SIZE = 250;

/** Chunking metadata for one eligible scalar structured field. */
export type StructuredOccupancyField = {
  /** Scalar comparison type. */
  type: "string" | "number";
  /** Use unit numeric chunks instead of decade chunks. */
  decimal?: boolean;
};

/** Eligible fields supplied with one structured document write. */
export type StructuredOccupancyFieldMap = Record<
  string,
  StructuredOccupancyField
>;

/** Optional context supplied with a structured document write. */
export type StructuredWriteContext = {
  /** All eligible scalar fields for the document type, including missing ones. */
  occupancyFields?: StructuredOccupancyFieldMap;
  /** True when this write removes the document rather than storing `{}`. */
  deleted?: boolean;
};

/** Persisted sparse criterion-chunk/sort-token existence hint. */
export type StructuredOccupancyItem = IndexTableKey & {
  kind: typeof INDEX_ITEM_KINDS.structuredOccupancy;
  generation: string;
  criterionField: string;
  sortField: string;
  criterionChunk: string;
  sortToken: string;
  sortValue: string | number;
};

/** Per-document row for an eligible sort field whose value is missing. */
export type StructuredMissingItem = IndexTableKey & {
  kind: typeof INDEX_ITEM_KINDS.structuredMissing;
  generation: string;
  sortField: string;
  docId: DocId;
};

/** Active/building pointer for occupancy rebuilds. */
export type StructuredOccupancyGenerationState = IndexTableKey & {
  kind: typeof INDEX_ITEM_KINDS.structuredGeneration;
  activeGeneration?: string;
  buildingGeneration?: string;
  version: number;
};

/** Canonical document snapshot accepted by rebuild helpers. */
export type StructuredOccupancyBackfillDocument = {
  docId: DocId;
  fields: StructuredDocFieldsRecord;
  occupancyFields: StructuredOccupancyFieldMap;
};

/** One sparse occupancy query response page. */
export type StructuredOccupancyPage = {
  cells: Array<Pick<StructuredOccupancyItem, "sortToken" | "sortValue">>;
  cursor?: string;
};

/** Inclusive encoded criterion-chunk bounds. */
export type StructuredChunkBounds = {
  lower: string;
  upper: string;
};

const firstCodePoints = (value: string, count: number): string =>
  Array.from(value).slice(0, count).join("");

/** Encode the criterion chunk containing one structured scalar value. */
export function encodeStructuredCriterionChunk(
  value: string | number,
  field: StructuredOccupancyField,
): string {
  if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("Numeric occupancy fields require finite numbers.");
    }
    const width = field.decimal ? 1 : 10;
    const start = Math.floor(value / width) * width;
    return `${INDEX_KEY_PARTS.number}${INDEX_KEY_SEPARATOR}${encodeSortableIndexNumber(start)}`;
  }

  if (typeof value !== "string") {
    throw new Error("String occupancy fields require string values.");
  }
  const codePoints = Array.from(value);
  const prefix = firstCodePoints(value, 3);
  const kind =
    codePoints.length <= 3 ? INDEX_KEY_PARTS.exact : INDEX_KEY_PARTS.prefix;
  const sortablePrefix = encodeSortableIndexValue(prefix);
  return `${INDEX_KEY_PARTS.string}${INDEX_KEY_SEPARATOR}${sortablePrefix}${INDEX_KEY_SEPARATOR}${kind}`;
}

const encodeStructuredCriterionChunkBoundary = (
  value: string | number,
  field: StructuredOccupancyField,
): string => {
  if (field.type === "number") {
    return encodeStructuredCriterionChunk(value, field);
  }
  if (typeof value !== "string") {
    throw new Error("String occupancy fields require string values.");
  }
  const prefix = firstCodePoints(value, 3);
  return `${INDEX_KEY_PARTS.string}${INDEX_KEY_SEPARATOR}${encodeSortableIndexValue(prefix)}${INDEX_KEY_SEPARATOR}`;
};

/** Return inclusive chunk bounds covering one exact/range criterion. */
export function buildStructuredChunkBounds(
  lower: string | number | undefined,
  upper: string | number | undefined,
  field: StructuredOccupancyField,
): StructuredChunkBounds {
  const minimum = `${field.type === "number" ? INDEX_KEY_PARTS.number : INDEX_KEY_PARTS.string}${INDEX_KEY_SEPARATOR}`;
  const maximum = `${minimum}\uffff`;
  return {
    lower:
      lower === undefined
        ? minimum
        : encodeStructuredCriterionChunkBoundary(lower, field),
    upper:
      upper === undefined
        ? maximum
        : `${encodeStructuredCriterionChunkBoundary(upper, field)}\uffff`,
  };
}

/** Build the partition key shared by one criterion/sort field pair. */
export function buildStructuredOccupancyPartitionKey(
  generation: string,
  criterionField: string,
  sortField: string,
): string {
  return buildIndexKey(
    INDEX_ITEM_KINDS.structuredOccupancy,
    generation,
    criterionField,
    sortField,
  );
}

/** Build one sparse occupancy item. */
export function buildStructuredOccupancyItem(
  generation: string,
  criterionField: string,
  criterionValue: string | number,
  criterionConfig: StructuredOccupancyField,
  sortField: string,
  sortValue: string | number,
): StructuredOccupancyItem {
  const criterionChunk = encodeStructuredCriterionChunk(
    criterionValue,
    criterionConfig,
  );
  const sortToken = encodeSortableIndexValue(sortValue);
  const key = assertIndexTableKey({
    pk: buildStructuredOccupancyPartitionKey(
      generation,
      criterionField,
      sortField,
    ),
    sk: assertIndexSortKey(
      `${criterionChunk}${INDEX_KEY_SEPARATOR}${sortToken}`,
    ),
  });
  return {
    ...key,
    kind: INDEX_ITEM_KINDS.structuredOccupancy,
    generation,
    criterionField,
    sortField,
    criterionChunk,
    sortToken,
    sortValue,
  };
}

/** Build the partition key for missing values of one sort field. */
export function buildStructuredMissingPartitionKey(
  generation: string,
  sortField: string,
): string {
  return buildIndexKey(
    INDEX_ITEM_KINDS.structuredMissing,
    generation,
    sortField,
  );
}

/** Build one missing-sort document row. */
export function buildStructuredMissingItem(
  generation: string,
  sortField: string,
  docId: DocId,
): StructuredMissingItem {
  const key = assertIndexTableKey({
    pk: buildStructuredMissingPartitionKey(generation, sortField),
    sk: buildIndexDocumentSortKey(docId),
  });
  return {
    ...key,
    kind: INDEX_ITEM_KINDS.structuredMissing,
    generation,
    sortField,
    docId,
  };
}

/** Physical singleton key for the active/building generation pointer. */
export function buildStructuredGenerationStateKey(): IndexTableKey {
  return assertIndexTableKey({
    pk: buildIndexKey(INDEX_ITEM_KINDS.structuredGeneration, "occupancy"),
    sk: INDEX_KEY_PARTS.state,
  });
}

/** Build a persisted generation pointer. */
export function buildStructuredGenerationStateItem(
  activeGeneration: string | undefined,
  buildingGeneration: string | undefined,
  version: number,
): StructuredOccupancyGenerationState {
  if (
    (!activeGeneration && !buildingGeneration) ||
    (activeGeneration !== undefined && activeGeneration.length === 0) ||
    (buildingGeneration !== undefined && buildingGeneration.length === 0) ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    throw new Error("Invalid structured occupancy generation state.");
  }
  return {
    ...buildStructuredGenerationStateKey(),
    kind: INDEX_ITEM_KINDS.structuredGeneration,
    ...(activeGeneration ? { activeGeneration } : {}),
    ...(buildingGeneration ? { buildingGeneration } : {}),
    version,
  };
}

/** Build all occupancy hints for one document and generation. */
export function buildStructuredOccupancyItems(
  generation: string,
  fields: StructuredDocFieldsRecord,
  occupancyFields: StructuredOccupancyFieldMap,
): StructuredOccupancyItem[] {
  const items = new Map<string, StructuredOccupancyItem>();
  const present = Object.entries(occupancyFields).flatMap(([field, config]) => {
    const value = fields[field];
    return !Array.isArray(value) &&
      ((config.type === "number" && typeof value === "number") ||
        (config.type === "string" && typeof value === "string"))
      ? [{ field, config, value }]
      : [];
  });

  for (const criterion of present) {
    for (const sort of present) {
      if (criterion.field === sort.field) {
        continue;
      }
      const item = buildStructuredOccupancyItem(
        generation,
        criterion.field,
        criterion.value,
        criterion.config,
        sort.field,
        sort.value,
      );
      items.set(`${item.pk}\u0000${item.sk}`, item);
    }
  }
  return Array.from(items.values());
}

/** Build missing-sort rows for one document and generation. */
export function buildStructuredMissingItems(
  generation: string,
  docId: DocId,
  fields: StructuredDocFieldsRecord,
  occupancyFields: StructuredOccupancyFieldMap,
): StructuredMissingItem[] {
  return Object.keys(occupancyFields).flatMap((field) => {
    const value = fields[field];
    return value === undefined || Array.isArray(value)
      ? [buildStructuredMissingItem(generation, field, docId)]
      : [];
  });
}
