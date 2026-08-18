/**
 * @packageDocumentation
 *
 * Logical indexed-query contracts. Expressions describe requested semantics;
 * physical backend capabilities decide how each leaf is executed.
 */
import type { DocId, TextIndexBackend } from "../Types";
import type { StructuredSearchDependencies } from "../structured/SearchStructured";
import type { StructuredWriter } from "../structured/Handlers";
import type { StructuredOccupancyFieldMap } from "../structured/StructuredOccupancy";
import type { StructuredStringTokenizerConfig } from "../structured/StructuredStringLike";

/** Canonical scalar value supported by exact and range indexes. */
export type IndexQueryValue = string | number | boolean | null;

/** Semantic text operations understood by the query compiler. */
export type TextMatchMode =
  | "caseInsensitiveEquals"
  | "caseInsensitiveContains"
  | "exact"
  | "phrase"
  | "prefix"
  | "lossy";

/** Exact scalar equality or collection-membership expression. */
export type IndexTermExpression = {
  type: "term";
  field: string;
  mode: "eq" | "contains";
  value: IndexQueryValue;
};

/** Inclusive scalar range expression. */
export type IndexRangeExpression =
  | {
      type: "between";
      field: string;
      lower: IndexQueryValue;
      upper: IndexQueryValue;
    }
  | {
      type: "gte" | "lte";
      field: string;
      value: IndexQueryValue;
    };

/** Text expression independent of its physical posting implementation. */
export type IndexTextExpression = {
  type: "text";
  field: string;
  mode: TextMatchMode;
  query: string;
};

/** Boolean conjunction. */
export type IndexAndExpression = { and: IndexExpression[] };

/** Boolean disjunction. */
export type IndexOrExpression = { or: IndexExpression[] };

/** Complete logical expression accepted by {@link searchIndex}. */
export type IndexExpression =
  | IndexTermExpression
  | IndexRangeExpression
  | IndexTextExpression
  | IndexAndExpression
  | IndexOrExpression;

/** Text capabilities enabled for one field. */
export type IndexedTextCapabilities = Partial<Record<TextMatchMode, true>>;

/** TypeInfo-derived physical capabilities for one logical field. */
export type IndexedFieldCapabilities = {
  /** Physical field name before type qualification. */
  field?: string;
  /** Field is canonically a collection rather than a scalar value. */
  collection?: true;
  exact?: true;
  membership?: true;
  range?: {
    valueType: "string" | "number";
    decimal?: true;
  };
  text?: IndexedTextCapabilities;
  optional?: true;
};

/** Type and field capability registry used by planning and mutation. */
export type IndexedFieldsByType = Record<
  string,
  Record<string, IndexedFieldCapabilities>
>;

/**
 * Unified backend made from specialized physical capabilities.
 *
 * The term/range/occupancy surface is supplied by `values`; text postings and
 * positions are supplied by `text`. They are composed by one logical engine.
 */
export type IndexBackend = {
  values: StructuredSearchDependencies;
  valueWriter?: StructuredWriter;
  text?: TextIndexBackend;
};

/** Create a structurally typed unified backend without coupling implementations. */
export const createIndexBackend = (backend: IndexBackend): IndexBackend =>
  backend;

/** Globally ordered candidate traversal requested by the ORM. */
export type IndexOrderBy = {
  field: string;
  reverse?: boolean;
  optional?: boolean;
};

/** Explicit execution budgets; exceeding one throws rather than truncating. */
export type IndexSearchLimits = {
  maxExpressionDepth: number;
  maxLeafCount: number;
  maxOrBranches: number;
  maxTextTokens: number;
  maxBackendPages: number;
  maxCandidates: number;
  maxCursorBytes: number;
};

/** Conservative defaults suitable for request-scoped serverless execution. */
export const DEFAULT_INDEX_SEARCH_LIMITS: IndexSearchLimits = {
  maxExpressionDepth: 16,
  maxLeafCount: 64,
  maxOrBranches: 32,
  maxTextTokens: 6,
  maxBackendPages: 256,
  maxCandidates: 10_000,
  maxCursorBytes: 4_096,
};

/** Typed indexed-query failure codes. */
export enum IndexQueryErrorCode {
  INVALID_CURSOR = "INDEX_QUERY_INVALID_CURSOR",
  STALE_CURSOR = "INDEX_QUERY_STALE_CURSOR",
  BUDGET_EXCEEDED = "INDEX_QUERY_BUDGET_EXCEEDED",
  UNSUPPORTED_EXPRESSION = "INDEX_QUERY_UNSUPPORTED_EXPRESSION",
  UNSUPPORTED_ORDER = "INDEX_QUERY_UNSUPPORTED_ORDER",
}

/** Error with a stable machine-readable code. */
export class IndexQueryError extends Error {
  constructor(
    readonly code: IndexQueryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IndexQueryError";
  }
}

/** Plan diagnostics emitted separately from top-level route selection. */
export type IndexSearchDiagnostics = {
  expressionKinds: Array<
    "term" | "between" | "gte" | "lte" | "text" | "and" | "or"
  >;
  driverKind: "term" | "range" | "text";
  mixed: boolean;
  requiresCanonicalVerification: boolean;
  strategy: "candidateIntersection" | "candidateUnion" | "singleLeaf";
  candidatesExamined: number;
  backendPagesRead: number;
};

/** Candidate page returned by the logical query engine. */
export type IndexCandidatePage = {
  candidateIds: DocId[];
  cursor?: string;
  requiresCanonicalVerification: boolean;
  diagnostics: IndexSearchDiagnostics;
};

/** Options that participate in planning and cursor identity. */
export type IndexSearchOptions = {
  limit?: number;
  cursor?: string;
  orderBy?: IndexOrderBy;
  occupancyFields?: StructuredOccupancyFieldMap;
  tokenizer?: Partial<StructuredStringTokenizerConfig>;
  limits?: Partial<IndexSearchLimits>;
  /** Additional schema/config identity supplied by an ORM integration. */
  planFingerprintParts?: unknown;
};
