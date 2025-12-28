import type { DocId } from "../types";
import type { StructuredSearchDependencies } from "./searchStructured";
import type { StructuredWriter } from "./handlers";
import type { StructuredQueryOptions, WhereValue } from "./types";
import type { StructuredDocFieldsRecord } from "./structuredDdb";
import { StructuredInMemoryIndex } from "./inMemory";

type StructuredPage = { candidateIds: DocId[]; lastEvaluatedKey?: string };

const normalizeFields = (fields: StructuredDocFieldsRecord): StructuredDocFieldsRecord => {
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

export class StructuredInMemoryBackend implements StructuredSearchDependencies, StructuredWriter {
  private docFields = new Map<DocId, StructuredDocFieldsRecord>();
  private index = new StructuredInMemoryIndex();

  private rebuildIndex(): void {
    const nextIndex = new StructuredInMemoryIndex();

    for (const [docId, fields] of this.docFields.entries()) {
      nextIndex.addDocument(docId, fields);
    }

    this.index = nextIndex;
  }

  private buildPage(
    page: { candidateIds: DocId[]; cursor?: string },
  ): StructuredPage {
    return {
      candidateIds: page.candidateIds,
      lastEvaluatedKey: page.cursor,
    };
  }

  terms: StructuredSearchDependencies["terms"] = {
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

  ranges: StructuredSearchDependencies["ranges"] = {
    between: async (
      field: string,
      lower: WhereValue,
      upper: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<StructuredPage> => {
      return this.buildPage(this.index.between(field, lower, upper, options));
    },
    gte: async (
      field: string,
      lower: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<StructuredPage> => {
      return this.buildPage(this.index.gte(field, lower, options));
    },
    lte: async (
      field: string,
      upper: WhereValue,
      options: StructuredQueryOptions = {},
    ): Promise<StructuredPage> => {
      return this.buildPage(this.index.lte(field, upper, options));
    },
  };

  async write(docId: DocId, fields: StructuredDocFieldsRecord): Promise<void> {
    const normalized = normalizeFields(fields);
    this.docFields.set(docId, normalized);
    this.rebuildIndex();
  }
}
