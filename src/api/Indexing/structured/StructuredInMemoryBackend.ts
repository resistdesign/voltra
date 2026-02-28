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

  /**
   * @param tokenizer Optional tokenizer overrides for structured string contains behavior.
   */
  constructor(private readonly tokenizer?: Partial<StructuredStringTokenizerConfig>) {
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
  };

  /**
   * Write structured fields for a document.
   * @param docId Document id to write.
   * @param fields Structured fields to store.
   * @returns Promise resolved once stored.
   */
  async write(docId: DocId, fields: StructuredDocFieldsRecord): Promise<void> {
    const normalized = normalizeFields(fields);
    this.docFields.set(docId, normalized);
    this.rebuildIndex();
  }
}
