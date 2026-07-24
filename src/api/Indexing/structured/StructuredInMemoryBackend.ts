/**
 * @packageDocumentation
 *
 * Independent, inspectable in-memory structured indexing backend.
 */
import type { DocId } from "../Types";
import { encodeSortableIndexValue } from "../IndexTable";
import type { StructuredSearchDependencies } from "./SearchStructured";
import type { StructuredWriter } from "./Handlers";
import type { StructuredQueryOptions, WhereValue } from "./Types";
import {
  buildStructuredDocFieldsItem,
  buildStructuredDocFieldsKey,
  buildStructuredRangeItem,
  buildStructuredRangePartitionKey,
  buildStructuredTermItem,
  buildStructuredTermKey,
  type StructuredDocFieldsItem,
  type StructuredDocFieldsRecord,
  type StructuredRangeIndexItem,
  type StructuredTermIndexItem,
} from "./StructuredIndexRecords";
import {
  type StructuredStringTokenizerConfig,
  buildStructuredStringContainsTokens,
} from "./StructuredStringLike";
import {
  INITIAL_STRUCTURED_OCCUPANCY_GENERATION,
  buildStructuredGenerationStateItem,
  buildStructuredGenerationStateKey,
  buildStructuredMissingItems,
  buildStructuredMissingPartitionKey,
  buildStructuredOccupancyItems,
  buildStructuredOccupancyPartitionKey,
  type StructuredMissingItem,
  type StructuredOccupancyBackfillDocument,
  type StructuredOccupancyGenerationState,
  type StructuredOccupancyItem,
  type StructuredWriteContext,
} from "./StructuredOccupancy";

type StructuredIndexRecord =
  | StructuredDocFieldsItem
  | StructuredTermIndexItem
  | StructuredRangeIndexItem
  | StructuredOccupancyItem
  | StructuredMissingItem
  | StructuredOccupancyGenerationState;

type StructuredPage = {
  candidateIds: DocId[];
  lastEvaluatedKey?: string;
};

const clone = <T>(value: T): T => structuredClone(value);
const recordKey = ({ pk, sk }: { pk: string; sk: string }): string =>
  JSON.stringify([pk, sk]);

const normalizeFields = (
  fields: StructuredDocFieldsRecord,
): StructuredDocFieldsRecord => {
  const normalized: StructuredDocFieldsRecord = {};
  for (const [field, value] of Object.entries(fields)) {
    normalized[field] = Array.isArray(value)
      ? (Array.from(new Set(value)) as WhereValue[])
      : value;
  }
  return normalized;
};

const buildTermItems = (
  docId: DocId,
  fields: StructuredDocFieldsRecord,
  tokenizer?: Partial<StructuredStringTokenizerConfig>,
): StructuredTermIndexItem[] => {
  const items: StructuredTermIndexItem[] = [];
  for (const [field, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const entry of new Set(value)) {
        items.push(buildStructuredTermItem(field, entry, "contains", docId));
      }
      continue;
    }
    items.push(buildStructuredTermItem(field, value, "eq", docId));
    if (typeof value === "string") {
      for (const token of buildStructuredStringContainsTokens(
        value,
        tokenizer,
      )) {
        items.push(buildStructuredTermItem(field, token, "contains", docId));
      }
    }
  }
  return items;
};

const buildRangeItems = (
  docId: DocId,
  fields: StructuredDocFieldsRecord,
): StructuredRangeIndexItem[] =>
  Object.entries(fields).flatMap(([field, value]) =>
    Array.isArray(value) ? [] : [buildStructuredRangeItem(field, value, docId)],
  );

const compareValues = (left: WhereValue, right: WhereValue): number => {
  const leftKey = encodeSortableIndexValue(left);
  const rightKey = encodeSortableIndexValue(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
};

const decodeCursor = (
  cursor?: string,
): { pk: string; sk: string } | undefined => {
  if (!cursor) {
    return undefined;
  }
  try {
    const value = JSON.parse(cursor) as { pk?: unknown; sk?: unknown };
    if (typeof value.pk !== "string" || typeof value.sk !== "string") {
      throw new Error();
    }
    return { pk: value.pk, sk: value.sk };
  } catch {
    throw new Error("Invalid structured cursor token.");
  }
};

const paginate = <T extends { pk: string; sk: string }>(
  source: T[],
  options: StructuredQueryOptions = {},
): { items: T[]; cursor?: string } => {
  const ordered = source
    .slice()
    .sort((left, right) =>
      left.sk < right.sk ? -1 : left.sk > right.sk ? 1 : 0,
    );
  if (options.reverse) {
    ordered.reverse();
  }
  const cursor = decodeCursor(options.cursor);
  const remaining = cursor
    ? ordered.filter((item) =>
        options.reverse ? item.sk < cursor.sk : item.sk > cursor.sk,
      )
    : ordered;
  const limit = options.limit ?? remaining.length;
  const items = remaining.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    ...(last && items.length < remaining.length
      ? { cursor: JSON.stringify({ pk: last.pk, sk: last.sk }) }
      : {}),
  };
};

/**
 * In-memory structured backend with its own maps and query implementation.
 *
 * It shares only the neutral structured record builders used by every storage
 * implementation. It does not instantiate or depend on the cloud driver.
 */
export class StructuredInMemoryBackend
  implements StructuredSearchDependencies, StructuredWriter
{
  private readonly records = new Map<string, StructuredIndexRecord>();

  /**
   * @param tokenizer Optional tokenizer overrides for structured contains
   * indexing.
   */
  constructor(readonly tokenizer?: Partial<StructuredStringTokenizerConfig>) {}

  private put(record: StructuredIndexRecord): void {
    this.records.set(recordKey(record), clone(record));
  }

  private delete(record: { pk: string; sk: string }): void {
    this.records.delete(recordKey(record));
  }

  private find<T extends StructuredIndexRecord>(
    predicate: (record: StructuredIndexRecord) => boolean,
  ): T[] {
    return Array.from(this.records.values()).filter(predicate) as T[];
  }

  private getGenerationState(): StructuredOccupancyGenerationState {
    const key = buildStructuredGenerationStateKey();
    return (
      (this.records.get(recordKey(key)) as
        StructuredOccupancyGenerationState | undefined) ?? {
        ...key,
        kind: "sg",
        activeGeneration: INITIAL_STRUCTURED_OCCUPANCY_GENERATION,
        version: 0,
      }
    );
  }

  /** Term lookup over independently stored term records. */
  readonly terms: StructuredSearchDependencies["terms"] = {
    query: async (
      field,
      mode,
      value,
      options: StructuredQueryOptions = {},
    ): Promise<StructuredPage> => {
      const partition = buildStructuredTermKey(field, value, mode);
      const page = paginate(
        this.find<StructuredTermIndexItem>(
          (record) => record.kind === "st" && record.pk === partition,
        ),
        options,
      );
      return {
        candidateIds: page.items.map((item) => item.docId),
        lastEvaluatedKey: page.cursor,
      };
    },
  };

  /** Range traversal over independently stored range records. */
  readonly ranges: StructuredSearchDependencies["ranges"] = {
    between: async (field, lower, upper, options = {}) =>
      this.rangePage(
        field,
        (item) =>
          compareValues(item.value, lower) >= 0 &&
          compareValues(item.value, upper) <= 0,
        options,
      ),
    gte: async (field, lower, options = {}) =>
      this.rangePage(
        field,
        (item) => compareValues(item.value, lower) >= 0,
        options,
      ),
    lte: async (field, upper, options = {}) =>
      this.rangePage(
        field,
        (item) => compareValues(item.value, upper) <= 0,
        options,
      ),
    all: async (field, options = {}) =>
      this.rangePage(field, () => true, options),
  };

  private rangePage(
    field: string,
    accept: (item: StructuredRangeIndexItem) => boolean,
    options: StructuredQueryOptions,
  ): StructuredPage {
    const partition = buildStructuredRangePartitionKey(field);
    const page = paginate(
      this.find<StructuredRangeIndexItem>(
        (record) =>
          record.kind === "sr" &&
          record.pk === partition &&
          accept(record as StructuredRangeIndexItem),
      ),
      options,
    );
    return {
      candidateIds: page.items.map((item) => item.docId),
      lastEvaluatedKey: page.cursor,
    };
  }

  /** Sparse occupancy traversal over persisted in-memory records. */
  readonly occupancy: NonNullable<StructuredSearchDependencies["occupancy"]> = {
    getActiveGeneration: async () => this.getGenerationState().activeGeneration,
    query: async (
      generation,
      criterionField,
      sortField,
      lowerChunk,
      upperChunk,
      options = {},
    ) => {
      const partition = buildStructuredOccupancyPartitionKey(
        generation,
        criterionField,
        sortField,
      );
      const page = paginate(
        this.find<StructuredOccupancyItem>(
          (record) =>
            record.kind === "so" &&
            record.pk === partition &&
            record.sk >= lowerChunk &&
            record.sk <= upperChunk,
        ),
        options,
      );
      return {
        cells: page.items.map(({ sortToken, sortValue }) => ({
          sortToken,
          sortValue,
        })),
        cursor: page.cursor,
      };
    },
  };

  /** Stable document-id stream for missing eligible sort values. */
  readonly missing: NonNullable<StructuredSearchDependencies["missing"]> = {
    all: async (generation, sortField, options = {}) => {
      const partition = buildStructuredMissingPartitionKey(
        generation,
        sortField,
      );
      const page = paginate(
        this.find<StructuredMissingItem>(
          (record) => record.kind === "sm" && record.pk === partition,
        ),
        options,
      );
      return {
        candidateIds: page.items.map((item) => item.docId),
        lastEvaluatedKey: page.cursor,
      };
    },
  };

  /** Canonical structured fields used by compound verification. */
  readonly documents: StructuredSearchDependencies["documents"] = {
    get: async (docId) => {
      const item = this.records.get(
        recordKey(buildStructuredDocFieldsKey(docId)),
      ) as StructuredDocFieldsItem | undefined;
      return item ? clone(item.fields) : undefined;
    },
  };

  /** Optional in-memory repair/compaction lifecycle. */
  readonly occupancyMaintenance = {
    getState: async () => clone(this.getGenerationState()),
    beginRebuild: async (generation: string) => {
      const state = this.getGenerationState();
      if (state.buildingGeneration) {
        throw new Error("A structured occupancy rebuild is already active.");
      }
      if (generation === state.activeGeneration) {
        throw new Error(
          "A rebuild generation must differ from the active generation.",
        );
      }
      this.put(
        buildStructuredGenerationStateItem(
          state.activeGeneration,
          generation,
          state.version + 1,
        ),
      );
    },
    backfillDocument: async (document: StructuredOccupancyBackfillDocument) => {
      const state = this.getGenerationState();
      if (!state.buildingGeneration) {
        throw new Error("No structured occupancy generation is building.");
      }
      for (const record of [
        ...buildStructuredOccupancyItems(
          state.buildingGeneration,
          document.fields,
          document.occupancyFields,
        ),
        ...buildStructuredMissingItems(
          state.buildingGeneration,
          document.docId,
          document.fields,
          document.occupancyFields,
        ),
      ]) {
        this.put(record);
      }
    },
    backfill: async (
      documents:
        | Iterable<StructuredOccupancyBackfillDocument>
        | AsyncIterable<StructuredOccupancyBackfillDocument>,
    ) => {
      let processedCount = 0;
      for await (const document of documents) {
        await this.occupancyMaintenance.backfillDocument(document);
        processedCount += 1;
      }
      return processedCount;
    },
    activateRebuild: async () => {
      const state = this.getGenerationState();
      if (!state.buildingGeneration) {
        throw new Error("No structured occupancy generation is building.");
      }
      this.put(
        buildStructuredGenerationStateItem(
          state.buildingGeneration,
          undefined,
          state.version + 1,
        ),
      );
    },
    retireGeneration: async (generation: string, fields: string[]) => {
      const state = this.getGenerationState();
      if (
        generation === state.activeGeneration ||
        generation === state.buildingGeneration
      ) {
        throw new Error(
          "Cannot retire an active structured occupancy generation.",
        );
      }
      const uniqueFields = Array.from(new Set(fields));
      const partitions = new Set([
        ...uniqueFields.map((field) =>
          buildStructuredMissingPartitionKey(generation, field),
        ),
        ...uniqueFields.flatMap((criterionField) =>
          uniqueFields
            .filter((sortField) => sortField !== criterionField)
            .map((sortField) =>
              buildStructuredOccupancyPartitionKey(
                generation,
                criterionField,
                sortField,
              ),
            ),
        ),
      ]);
      const records = this.find((record) => partitions.has(record.pk));
      for (const record of records) {
        this.delete(record);
      }
      return records.length;
    },
  };

  /** Write canonical and derived records through the normal item lifecycle. */
  async write(
    docId: DocId,
    fields: StructuredDocFieldsRecord,
    context: StructuredWriteContext = {},
  ): Promise<void> {
    const docKey = buildStructuredDocFieldsKey(docId);
    const previous = this.records.get(recordKey(docKey)) as
      StructuredDocFieldsItem | undefined;
    const previousFields = previous?.fields ?? {};
    const normalized = normalizeFields(fields);
    const occupancyFields = context.occupancyFields ?? {};
    const generations = Array.from(
      new Set(
        [
          this.getGenerationState().activeGeneration,
          this.getGenerationState().buildingGeneration,
        ].filter((value): value is string => !!value),
      ),
    );

    for (const record of [
      ...buildTermItems(docId, previousFields, this.tokenizer),
      ...buildRangeItems(docId, previousFields),
      ...generations.flatMap((generation) =>
        buildStructuredMissingItems(
          generation,
          docId,
          previousFields,
          previous?.occupancyFields ?? occupancyFields,
        ),
      ),
    ]) {
      this.delete(record);
    }

    this.put(
      buildStructuredDocFieldsItem(
        docId,
        normalized,
        (previous?.version ?? 0) + 1,
        occupancyFields,
      ),
    );

    for (const record of [
      ...buildTermItems(docId, normalized, this.tokenizer),
      ...buildRangeItems(docId, normalized),
      ...generations.flatMap((generation) =>
        buildStructuredOccupancyItems(generation, normalized, occupancyFields),
      ),
      ...(context.deleted
        ? []
        : generations.flatMap((generation) =>
            buildStructuredMissingItems(
              generation,
              docId,
              normalized,
              occupancyFields,
            ),
          )),
    ]) {
      this.put(record);
    }
  }

  /**
   * Begin an optional replacement-generation repair/compaction.
   *
   * @deprecated Prefer {@link occupancyMaintenance}.
   */
  async beginOccupancyRebuild(generation: string): Promise<void> {
    await this.occupancyMaintenance.beginRebuild(generation);
  }

  /**
   * Activate an optional replacement generation.
   *
   * @deprecated Prefer {@link occupancyMaintenance}.
   */
  async activateOccupancyRebuild(): Promise<void> {
    await this.occupancyMaintenance.activateRebuild();
  }

  /** Deep-cloned conceptual records stored by the in-memory backend. */
  snapshotIndexRecords(): Array<Record<string, unknown>> {
    return Array.from(this.records.values(), (record) => clone(record));
  }

  /** Deep-cloned keyed map of conceptual in-memory index records. */
  snapshotIndexRecordMap(): ReadonlyMap<string, Record<string, unknown>> {
    return new Map(
      Array.from(this.records, ([key, value]) => [key, clone(value)]),
    );
  }
}
