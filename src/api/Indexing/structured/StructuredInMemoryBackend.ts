/**
 * @packageDocumentation
 *
 * In-memory backend that wires {@link StructuredInMemoryIndex} to the structured
 * search interfaces and write contract.
 */
import type { DocId } from "../Types";
import type { StructuredSearchDependencies } from "./SearchStructured";
import type { StructuredWriter } from "./Handlers";
import type { StructuredQueryOptions, WhereValue } from "./Types";
import type { StructuredDocFieldsRecord } from "./StructuredDdb";
import type { StructuredStringTokenizerConfig } from "./StructuredStringLike";
import { StructuredInMemoryIndex } from "./StructuredInMemoryIndex";
import {
  buildStructuredMissingItems,
  buildStructuredOccupancyItems,
  type StructuredOccupancyFieldMap,
  type StructuredWriteContext,
} from "./StructuredOccupancy";

type StructuredPage = { candidateIds: DocId[]; lastEvaluatedKey?: string };

const normalizeFields = (
  fields: StructuredDocFieldsRecord,
): StructuredDocFieldsRecord => {
  const normalized: StructuredDocFieldsRecord = {};

  for (const [field, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      normalized[field] = Array.from(new Set(value)) as WhereValue[];
    } else {
      normalized[field] = value;
    }
  }

  return normalized;
};

/**
 * In-memory structured backend for tests and local usage.
 */
export class StructuredInMemoryBackend
  implements StructuredSearchDependencies, StructuredWriter
{
  private docFields = new Map<DocId, StructuredDocFieldsRecord>();
  private index: StructuredInMemoryIndex;
  private occupancyFieldsByDoc = new Map<DocId, StructuredOccupancyFieldMap>();
  private activeGeneration?: string;
  private buildingGeneration?: string;

  /**
   * @param tokenizer Optional tokenizer overrides for structured string contains behavior.
   */
  constructor(readonly tokenizer?: Partial<StructuredStringTokenizerConfig>) {
    this.index = new StructuredInMemoryIndex(tokenizer);
  }

  private rebuildIndex(): void {
    const nextIndex = new StructuredInMemoryIndex(this.tokenizer);

    for (const [docId, fields] of this.docFields.entries()) {
      nextIndex.addDocument(docId, fields);
    }

    this.index = nextIndex;
  }

  private buildPage(page: {
    candidateIds: DocId[];
    cursor?: string;
  }): StructuredPage {
    return {
      candidateIds: page.candidateIds,
      lastEvaluatedKey: page.cursor,
    };
  }

  /**
   * Term query implementation for structured search.
   */
  terms: StructuredSearchDependencies["terms"] = {
    /**
     * @param field Field name to query.
     * @param mode Term match mode.
     * @param value Value to match.
     * @param options Optional paging options.
     * @returns Candidate page with optional cursor token.
     */
    query: async (
      field: string,
      mode: "eq" | "contains",
      value: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<StructuredPage> => {
      const page =
        mode === "contains"
          ? this.index.contains(field, value, options)
          : this.index.eq(field, value, options);

      return this.buildPage(page);
    },
  };

  /**
   * Range query implementation for structured search.
   */
  ranges: StructuredSearchDependencies["ranges"] = {
    /**
     * @param field Field name to query.
     * @param lower Inclusive lower bound.
     * @param upper Inclusive upper bound.
     * @param options Optional paging options.
     * @returns Candidate page with optional cursor token.
     */
    between: async (
      field: string,
      lower: WhereValue,
      upper: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<StructuredPage> => {
      return this.buildPage(this.index.between(field, lower, upper, options));
    },
    /**
     * @param field Field name to query.
     * @param lower Inclusive lower bound.
     * @param options Optional paging options.
     * @returns Candidate page with optional cursor token.
     */
    gte: async (
      field: string,
      lower: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<StructuredPage> => {
      return this.buildPage(this.index.gte(field, lower, options));
    },
    /**
     * @param field Field name to query.
     * @param upper Inclusive upper bound.
     * @param options Optional paging options.
     * @returns Candidate page with optional cursor token.
     */
    lte: async (
      field: string,
      upper: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<StructuredPage> => {
      return this.buildPage(this.index.lte(field, upper, options));
    },
    /** Traverse a scalar field in its native order. */
    all: async (
      field: string,
      options: StructuredQueryOptions = {},
    ): Promise<StructuredPage> =>
      this.buildPage(this.index.all(field, options)),
  };

  /** Sparse in-memory occupancy metadata with Dynamo-equivalent ordering. */
  occupancy: NonNullable<StructuredSearchDependencies["occupancy"]> = {
    getActiveGeneration: async () => this.activeGeneration,
    query: async (
      generation,
      criterionField,
      sortField,
      lowerChunk,
      upperChunk,
      options = {},
    ) => {
      if (
        generation !== this.activeGeneration &&
        generation !== this.buildingGeneration
      ) {
        return { cells: [] };
      }
      const cells = new Map<
        string,
        { sortToken: string; sortValue: string | number }
      >();
      for (const [docId, fields] of this.docFields) {
        const fieldConfig = this.occupancyFieldsByDoc.get(docId) ?? {};
        for (const item of buildStructuredOccupancyItems(
          generation,
          fields,
          fieldConfig,
        )) {
          if (
            item.criterionField === criterionField &&
            item.sortField === sortField &&
            item.criterionChunk >= lowerChunk &&
            item.criterionChunk <= upperChunk
          ) {
            cells.set(item.sk, {
              sortToken: item.sortToken,
              sortValue: item.sortValue,
            });
          }
        }
      }
      const ordered = Array.from(cells.entries()).sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0,
      );
      const start = options.cursor ? Number(options.cursor) : 0;
      const limit = options.limit ?? ordered.length;
      const page = ordered.slice(start, start + limit);
      return {
        cells: page.map(([, cell]) => cell),
        ...(start + page.length < ordered.length
          ? { cursor: String(start + page.length) }
          : {}),
      };
    },
  };

  /** Stable document-id stream for missing eligible sort values. */
  missing: NonNullable<StructuredSearchDependencies["missing"]> = {
    all: async (generation, sortField, options = {}) => {
      if (generation !== this.activeGeneration) {
        return { candidateIds: [] };
      }
      const ids = Array.from(this.docFields)
        .filter(([docId, fields]) =>
          buildStructuredMissingItems(
            generation,
            docId,
            fields,
            this.occupancyFieldsByDoc.get(docId) ?? {},
          ).some((item) => item.sortField === sortField),
        )
        .map(([docId]) => docId)
        .sort((left, right) =>
          String(left) < String(right)
            ? -1
            : String(left) > String(right)
              ? 1
              : 0,
        );
      const start = options.cursor ? Number(options.cursor) : 0;
      const limit = options.limit ?? ids.length;
      const candidateIds = ids.slice(start, start + limit);
      return {
        candidateIds,
        ...(start + candidateIds.length < ids.length
          ? { lastEvaluatedKey: String(start + candidateIds.length) }
          : {}),
      };
    },
  };

  /** Canonical structured fields used by compound verification. */
  documents: StructuredSearchDependencies["documents"] = {
    get: async (docId: DocId) => this.docFields.get(docId),
  };

  /**
   * Write structured fields for a document.
   * @param docId Document id to write.
   * @param fields Structured fields to store.
   * @returns Promise resolved once stored.
   */
  async write(
    docId: DocId,
    fields: StructuredDocFieldsRecord,
    context: StructuredWriteContext = {},
  ): Promise<void> {
    const normalized = normalizeFields(fields);
    if (context.deleted) {
      this.docFields.delete(docId);
      this.occupancyFieldsByDoc.delete(docId);
    } else {
      this.docFields.set(docId, normalized);
      this.occupancyFieldsByDoc.set(docId, context.occupancyFields ?? {});
    }
    this.rebuildIndex();
  }

  /** Begin an explicit in-memory rebuild; writes dual-target until activation. */
  beginOccupancyRebuild(generation: string): void {
    if (!generation) {
      throw new Error("A structured occupancy generation is required.");
    }
    if (this.buildingGeneration) {
      throw new Error("A structured occupancy rebuild is already active.");
    }
    if (generation === this.activeGeneration) {
      throw new Error(
        "A rebuild generation must differ from the active generation.",
      );
    }
    this.buildingGeneration = generation;
  }

  /** Activate the building generation and invalidate older occupancy cursors. */
  activateOccupancyRebuild(): void {
    if (!this.buildingGeneration) {
      throw new Error("No structured occupancy generation is building.");
    }
    this.activeGeneration = this.buildingGeneration;
    this.buildingGeneration = undefined;
  }
}
