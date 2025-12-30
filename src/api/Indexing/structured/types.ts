/**
 * @packageDocumentation
 *
 * Types for structured query expressions and paging options.
 */
import type { DocId } from "../types.js";

/**
 * Supported value types for structured queries.
 */
export type WhereValue = string | number | boolean | null;

/**
 * Term clause for structured queries.
 */
export type StructuredTermWhere = {
  /**
   * Clause type discriminator.
   */
  type: 'term';
  /**
   * Field name to query.
   */
  field: string;
  /**
   * Term match mode.
   */
  mode: 'eq' | 'contains';
  /**
   * Value to match.
   */
  value: WhereValue;
};

/**
 * Range clause for structured queries.
 */
export type StructuredRangeWhere =
  | {
      /**
       * Clause type discriminator for range between.
       */
      type: 'between';
      /**
       * Field name to query.
       */
      field: string;
      /**
       * Inclusive lower bound value.
       */
      lower: WhereValue;
      /**
       * Inclusive upper bound value.
       */
      upper: WhereValue;
    }
  | {
      /**
       * Clause type discriminator for range gte.
       */
      type: 'gte';
      /**
       * Field name to query.
       */
      field: string;
      /**
       * Inclusive lower bound value.
       */
      value: WhereValue;
    }
  | {
      /**
       * Clause type discriminator for range lte.
       */
      type: 'lte';
      /**
       * Field name to query.
       */
      field: string;
      /**
       * Inclusive upper bound value.
       */
      value: WhereValue;
    };

/**
 * Conjunction clause for structured queries.
 */
export type WhereAnd = {
  /**
   * All child clauses must match.
   */
  and: Where[];
};

/**
 * Disjunction clause for structured queries.
 */
export type WhereOr = {
  /**
   * Any child clause may match.
   */
  or: Where[];
};

/**
 * Structured query expression.
 */
export type Where = WhereAnd | WhereOr | StructuredTermWhere | StructuredRangeWhere;

/**
 * Paging options for structured queries.
 */
export type StructuredQueryOptions = {
  /**
   * Optional maximum number of candidates to return.
   */
  limit?: number;
  /**
   * Optional cursor string for pagination.
   */
  cursor?: string;
};

/**
 * Candidate ids and cursor for structured searches.
 */
export type CandidatePage = {
  /**
   * Candidate document ids for the page.
   */
  candidateIds: DocId[];
  /**
   * Cursor string for the next page, if more results exist.
   */
  cursor?: string;
};
