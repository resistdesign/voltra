/**
 * @packageDocumentation
 *
 * Types for structured query expressions and paging options.
 */
import type { DocId } from "../types.js";

export type WhereValue = string | number | boolean | null;

export type StructuredTermWhere = {
  type: 'term';
  field: string;
  mode: 'eq' | 'contains';
  value: WhereValue;
};

export type StructuredRangeWhere =
  | {
      type: 'between';
      field: string;
      lower: WhereValue;
      upper: WhereValue;
    }
  | {
      type: 'gte';
      field: string;
      value: WhereValue;
    }
  | {
      type: 'lte';
      field: string;
      value: WhereValue;
    };

export type Where =
  | { and: Where[] }
  | { or: Where[] }
  | StructuredTermWhere
  | StructuredRangeWhere;

export type StructuredQueryOptions = {
  limit?: number;
  cursor?: string;
};

export type CandidatePage = {
  candidateIds: DocId[];
  cursor?: string;
};
