/**
 * Structured indexing persistence for the S3 driver.
 *
 * Generic structured planning, record construction, mutation diffing,
 * occupancy semantics, and verification remain under Indexing.
 */
import type { DocId } from "../../../../Indexing/Types";
import type {
  StructuredDocumentListOptions,
  StructuredDocumentPage,
  StructuredSearchDependencies,
} from "../../../../Indexing/structured/SearchStructured";
import type {
  StructuredQueryOptions,
  WhereValue,
} from "../../../../Indexing/structured/Types";
import {
  buildStructuredDocFieldsItem,
  buildStructuredDocFieldsKey,
  buildStructuredRangePartitionKey,
  buildStructuredTermKey,
  serializeStructuredValue,
  type StructuredDocFieldsItem,
  type StructuredDocFieldsRecord,
  type StructuredDocFieldsState,
  type StructuredRangeIndexItem,
  type StructuredRangeIndexKey,
  type StructuredTermIndexItem,
  type StructuredTermIndexKey,
} from "../../../../Indexing/structured/StructuredIndexRecords";
import {
  StructuredIndexWriter,
  type StructuredDerivedMutation,
  type StructuredWriterDependencies,
  type StructuredWriterOptions,
} from "../../../../Indexing/structured/StructuredWriter";
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
} from "../../../../Indexing/structured/StructuredOccupancy";
import type { StructuredStringTokenizerConfig } from "../../../../Indexing/structured/StructuredStringLike";
import { S3IndexRecordStore } from "./S3IndexRecordStore";
import type { S3IndexObjectStore } from "./S3IndexObjectStore";

const COLLECTION_TERM = "structured-term";
const COLLECTION_RANGE = "structured-range";
const COLLECTION_DOCUMENT = "structured-document";
const COLLECTION_OCCUPANCY = "structured-occupancy";
const COLLECTION_MISSING = "structured-missing";
const COLLECTION_GENERATION = "structured-generation";

export type StructuredS3Config = {
  store: S3IndexObjectStore;
  writerOptions?: StructuredWriterOptions;
  tokenizer?: Partial<StructuredStringTokenizerConfig>;
};

const buildRangeLowerKey = (value: WhereValue): string =>
  `${serializeStructuredValue(value)}#`;
const buildRangeUpperKey = (value: WhereValue): string =>
  `${serializeStructuredValue(value)}#\uffff`;

const inBounds = (
  value: string,
  lower?: string,
  upper?: string,
): boolean =>
  (lower === undefined || value >= lower) &&
  (upper === undefined || value <= upper);

class StructuredS3Reader implements StructuredSearchDependencies {
  readonly tokenizer?: Partial<StructuredStringTokenizerConfig>;

  constructor(
    private readonly records: S3IndexRecordStore,
    config: StructuredS3Config,
  ) {
    this.tokenizer = config.tokenizer;
  }

  private async rangePage(
    field: string,
    lower: string | undefined,
    upper: string | undefined,
    options: StructuredQueryOptions = {},
  ): Promise<{ candidateIds: DocId[]; lastEvaluatedKey?: string }> {
    const page = await this.records.listPartition<StructuredRangeIndexItem>(
      COLLECTION_RANGE,
      buildStructuredRangePartitionKey(field),
      {
        limit: options.limit,
        cursor: options.cursor,
        reverse: options.reverse,
      },
    );
    const items = page.items.filter((item) =>
      inBounds(item.sk, lower, upper),
    );

    let cursor = page.cursor;
    if (page.items.length > 0) {
      if (!options.reverse && upper !== undefined) {
        if (page.items.some((item) => item.sk > upper)) {
          cursor = undefined;
        }
      } else if (options.reverse && lower !== undefined) {
        if (page.items.some((item) => item.sk < lower)) {
          cursor = undefined;
        }
      }
    }

    return {
      candidateIds: items.map((item) => item.docId),
      ...(cursor ? { lastEvaluatedKey: cursor } : {}),
    };
  }

  readonly terms: StructuredSearchDependencies["terms"] = {
    query: async (field, mode, value, options = {}) => {
      const page = await this.records.listPartition<StructuredTermIndexItem>(
        COLLECTION_TERM,
        buildStructuredTermKey(field, value, mode),
        {
          limit: options.limit,
          cursor: options.cursor,
          reverse: options.reverse,
        },
      );
      return {
        candidateIds: page.items.map((item) => item.docId),
        ...(page.cursor ? { lastEvaluatedKey: page.cursor } : {}),
      };
    },
  };

  readonly ranges: StructuredSearchDependencies["ranges"] = {
    between: (field, lower, upper, options = {}) =>
      this.rangePage(
        field,
        buildRangeLowerKey(lower),
        buildRangeUpperKey(upper),
        options,
      ),
    gte: (field, lower, options = {}) =>
      this.rangePage(field, buildRangeLowerKey(lower), undefined, options),
    lte: (field, upper, options = {}) =>
      this.rangePage(field, undefined, buildRangeUpperKey(upper), options),
    all: (field, options = {}) =>
      this.rangePage(field, undefined, undefined, options),
  };

  readonly documents: NonNullable<StructuredSearchDependencies["documents"]> = {
    get: async (docId) =>
      (
        await this.records.get<StructuredDocFieldsItem>(
          COLLECTION_DOCUMENT,
          buildStructuredDocFieldsKey(docId),
        )
      )?.item.fields,
    getMany: async (docIds) => {
      const values = await Promise.all(
        docIds.map(async (docId) => ({
          docId,
          fields: await this.documents.get(docId),
        })),
      );
      return new Map(
        values.flatMap(({ docId, fields }) =>
          fields ? [[docId, fields] as const] : [],
        ),
      );
    },
    list: async (
      options: StructuredDocumentListOptions = {},
    ): Promise<StructuredDocumentPage> => {
      const page =
        await this.records.listCollection<StructuredDocFieldsItem>(
          COLLECTION_DOCUMENT,
          options,
        );
      return {
        documents: page.items.map((item) => ({
          docId: item.docId,
          fields: item.fields,
          version: item.version,
        })),
        ...(page.cursor ? { cursor: page.cursor } : {}),
      };
    },
  };

  readonly occupancy: NonNullable<StructuredSearchDependencies["occupancy"]> =
    {
      getActiveGeneration: async () =>
        (
          await this.records.get<StructuredOccupancyGenerationState>(
            COLLECTION_GENERATION,
            buildStructuredGenerationStateKey(),
          )
        )?.item.activeGeneration ?? INITIAL_STRUCTURED_OCCUPANCY_GENERATION,
      query: async (
        generation,
        criterionField,
        sortField,
        lowerChunk,
        upperChunk,
        options = {},
      ) => {
        const page =
          await this.records.listPartition<StructuredOccupancyItem>(
            COLLECTION_OCCUPANCY,
            buildStructuredOccupancyPartitionKey(
              generation,
              criterionField,
              sortField,
            ),
            {
              limit: options.limit,
              cursor: options.cursor,
              reverse: options.reverse,
            },
          );
        const cells = page.items
          .filter(
            (item) =>
              item.criterionChunk >= lowerChunk &&
              item.criterionChunk <= upperChunk,
          )
          .map(({ sortToken, sortValue }) => ({ sortToken, sortValue }));
        return {
          cells,
          ...(page.cursor ? { cursor: page.cursor } : {}),
        };
      },
    };

  readonly missing: NonNullable<StructuredSearchDependencies["missing"]> = {
    all: async (generation, sortField, options = {}) => {
      const page = await this.records.listPartition<StructuredMissingItem>(
        COLLECTION_MISSING,
        buildStructuredMissingPartitionKey(generation, sortField),
        {
          limit: options.limit,
          cursor: options.cursor,
          reverse: options.reverse,
        },
      );
      return {
        candidateIds: page.items.map((item) => item.docId),
        ...(page.cursor ? { lastEvaluatedKey: page.cursor } : {}),
      };
    },
  };
}

class StructuredS3WriterDependencies implements StructuredWriterDependencies {
  constructor(private readonly records: S3IndexRecordStore) {}

  async loadDocFieldsState(
    docId: DocId,
  ): Promise<StructuredDocFieldsState | undefined> {
    const record = await this.records.get<StructuredDocFieldsItem>(
      COLLECTION_DOCUMENT,
      buildStructuredDocFieldsKey(docId),
    );
    return record
      ? {
          fields: record.item.fields,
          version: record.item.version,
          ...(record.item.occupancyFields
            ? { occupancyFields: record.item.occupancyFields }
            : {}),
        }
      : undefined;
  }

  async putDocFieldsIfVersion(
    docId: DocId,
    expectedVersion: number | undefined,
    fields: StructuredDocFieldsRecord,
    occupancyFields?: StructuredDocFieldsState["occupancyFields"],
  ): Promise<boolean> {
    return this.records.putIfVersion(
      COLLECTION_DOCUMENT,
      buildStructuredDocFieldsItem(
        docId,
        fields,
        (expectedVersion ?? 0) + 1,
        occupancyFields,
      ),
      expectedVersion,
    );
  }

  async putTermEntries(entries: StructuredTermIndexItem[]): Promise<void> {
    await this.records.putMany(COLLECTION_TERM, entries);
  }

  async deleteTermEntries(entries: StructuredTermIndexKey[]): Promise<void> {
    await this.records.deleteMany(COLLECTION_TERM, entries);
  }

  async putRangeEntries(entries: StructuredRangeIndexItem[]): Promise<void> {
    await this.records.putMany(COLLECTION_RANGE, entries);
  }

  async deleteRangeEntries(entries: StructuredRangeIndexKey[]): Promise<void> {
    await this.records.deleteMany(COLLECTION_RANGE, entries);
  }

  async loadOccupancyGenerationState(): Promise<
    StructuredOccupancyGenerationState | undefined
  > {
    return (
      await this.records.get<StructuredOccupancyGenerationState>(
        COLLECTION_GENERATION,
        buildStructuredGenerationStateKey(),
      )
    )?.item;
  }

  async writeDerivedEntries(
    mutation: StructuredDerivedMutation,
  ): Promise<void> {
    await this.records.deleteMany(COLLECTION_TERM, mutation.deleteTerms);
    await this.records.deleteMany(COLLECTION_RANGE, mutation.deleteRanges);
    await this.records.deleteMany(COLLECTION_MISSING, mutation.deleteMissing);
    await this.records.putMany(COLLECTION_TERM, mutation.putTerms);
    await this.records.putMany(COLLECTION_RANGE, mutation.putRanges);
    await this.records.putMany(COLLECTION_OCCUPANCY, mutation.putOccupancy);
    await this.records.putMany(COLLECTION_MISSING, mutation.putMissing);
  }
}

/** Explicit S3 occupancy generation lifecycle. */
export class StructuredS3OccupancyMaintenance {
  constructor(private readonly records: S3IndexRecordStore) {}

  async getState(): Promise<StructuredOccupancyGenerationState> {
    return (
      await this.records.get<StructuredOccupancyGenerationState>(
        COLLECTION_GENERATION,
        buildStructuredGenerationStateKey(),
      )
    )?.item ?? {
      ...buildStructuredGenerationStateKey(),
      kind: "sg",
      activeGeneration: INITIAL_STRUCTURED_OCCUPANCY_GENERATION,
      version: 0,
    };
  }

  private async compareAndSwap(
    expectedVersion: number | undefined,
    next: StructuredOccupancyGenerationState,
  ): Promise<void> {
    const written = await this.records.putIfVersion(
      COLLECTION_GENERATION,
      next,
      expectedVersion,
    );
    if (!written) {
      throw new Error("Structured occupancy generation changed concurrently.");
    }
  }

  async beginRebuild(generation: string): Promise<void> {
    const state = await this.getState();
    if (state.buildingGeneration) {
      throw new Error("A structured occupancy rebuild is already active.");
    }
    if (generation === state.activeGeneration) {
      throw new Error(
        "A rebuild generation must differ from the active generation.",
      );
    }
    await this.compareAndSwap(
      state.version === 0 ? undefined : state.version,
      buildStructuredGenerationStateItem(
        state.activeGeneration,
        generation,
        state.version + 1,
      ),
    );
  }

  async backfillDocument(
    document: StructuredOccupancyBackfillDocument,
  ): Promise<void> {
    const state = await this.getState();
    if (!state.buildingGeneration) {
      throw new Error("No structured occupancy generation is building.");
    }
    await this.records.putMany(
      COLLECTION_OCCUPANCY,
      buildStructuredOccupancyItems(
        state.buildingGeneration,
        document.fields,
        document.occupancyFields,
      ),
    );
    await this.records.putMany(
      COLLECTION_MISSING,
      buildStructuredMissingItems(
        state.buildingGeneration,
        document.docId,
        document.fields,
        document.occupancyFields,
      ),
    );
  }

  async backfill(
    documents:
      | Iterable<StructuredOccupancyBackfillDocument>
      | AsyncIterable<StructuredOccupancyBackfillDocument>,
  ): Promise<number> {
    let processedCount = 0;
    for await (const document of documents) {
      await this.backfillDocument(document);
      processedCount += 1;
    }
    return processedCount;
  }

  async activateRebuild(): Promise<void> {
    const state = await this.getState();
    if (!state.buildingGeneration) {
      throw new Error("No structured occupancy generation is building.");
    }
    await this.compareAndSwap(
      state.version,
      buildStructuredGenerationStateItem(
        state.buildingGeneration,
        undefined,
        state.version + 1,
      ),
    );
  }

  async retireGeneration(
    generation: string,
    fields: string[],
  ): Promise<number> {
    const state = await this.getState();
    if (
      generation === state.activeGeneration ||
      generation === state.buildingGeneration
    ) {
      throw new Error(
        "Cannot retire an active structured occupancy generation.",
      );
    }
    const uniqueFields = Array.from(new Set(fields));
    const partitions = [
      ...uniqueFields.map((sortField) => ({
        collection: COLLECTION_MISSING,
        pk: buildStructuredMissingPartitionKey(generation, sortField),
      })),
      ...uniqueFields.flatMap((criterionField) =>
        uniqueFields
          .filter((sortField) => sortField !== criterionField)
          .map((sortField) => ({
            collection: COLLECTION_OCCUPANCY,
            pk: buildStructuredOccupancyPartitionKey(
              generation,
              criterionField,
              sortField,
            ),
          })),
      ),
    ];

    let deletedCount = 0;
    for (const { collection, pk } of partitions) {
      let cursor: string | undefined;
      do {
        const page = await this.records.listPartition(
          collection,
          pk,
          { limit: 250, cursor },
        );
        await this.records.deleteMany(collection, page.items);
        deletedCount += page.items.length;
        cursor = page.cursor;
      } while (cursor);
    }
    return deletedCount;
  }
}

/** Complete S3 structured backend composed from generic strategy + S3 storage. */
export class StructuredS3Backend {
  readonly reader: StructuredSearchDependencies;
  readonly writer: StructuredIndexWriter;
  readonly occupancyMaintenance: StructuredS3OccupancyMaintenance;

  constructor(config: StructuredS3Config) {
    const records = new S3IndexRecordStore(config.store);
    this.reader = new StructuredS3Reader(records, config);
    this.writer = new StructuredIndexWriter(
      new StructuredS3WriterDependencies(records),
      {
        ...config.writerOptions,
        tokenizer: config.writerOptions?.tokenizer ?? config.tokenizer,
      },
    );
    this.occupancyMaintenance = new StructuredS3OccupancyMaintenance(records);
  }
}
