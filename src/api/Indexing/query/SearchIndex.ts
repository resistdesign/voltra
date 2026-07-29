import { searchExact, searchLossy } from "../API";
import { SEARCH_DEFAULTS } from "../Handler/Config";
import { compareDocId } from "../docId";
import { searchStructured } from "../structured/SearchStructured";
import type { Where } from "../structured/Types";
import type { DocId } from "../Types";
import {
  decodeIndexSearchCursor,
  encodeIndexSearchCursor,
  fingerprintIndexQuery,
  INDEX_SEARCH_CURSOR_VERSION,
} from "./Cursor";
import {
  DEFAULT_INDEX_SEARCH_LIMITS,
  IndexQueryError,
  IndexQueryErrorCode,
  type IndexBackend,
  type IndexCandidatePage,
  type IndexExpression,
  type IndexRangeExpression,
  type IndexSearchDiagnostics,
  type IndexSearchLimits,
  type IndexSearchOptions,
  type IndexTermExpression,
  type IndexTextExpression,
} from "./Types";

type ExecutionContext = {
  backend: IndexBackend;
  options: IndexSearchOptions;
  limits: IndexSearchLimits;
  backendPagesRead: number;
  candidatesExamined: number;
};

type MaterializedCandidates = {
  ids: DocId[];
  exact: boolean;
  driverKind: "term" | "range" | "text";
};

const isBoolean = (
  expression: IndexExpression,
): expression is { and: IndexExpression[] } | { or: IndexExpression[] } =>
  "and" in expression || "or" in expression;

const isText = (
  expression: IndexExpression,
): expression is IndexTextExpression =>
  !isBoolean(expression) && expression.type === "text";

const isValueExpression = (
  expression: IndexExpression,
): expression is
  | IndexTermExpression
  | IndexRangeExpression
  | { and: IndexExpression[] }
  | { or: IndexExpression[] } => {
  if (isText(expression)) {
    return false;
  }
  if (!isBoolean(expression)) {
    return true;
  }
  const children = "and" in expression ? expression.and : expression.or;
  return children.every(isValueExpression);
};

const toWhere = (expression: IndexExpression): Where => {
  if (isBoolean(expression)) {
    return "and" in expression
      ? { and: expression.and.map(toWhere) }
      : { or: expression.or.map(toWhere) };
  }
  if (expression.type === "text") {
    throw new IndexQueryError(
      IndexQueryErrorCode.UNSUPPORTED_EXPRESSION,
      "Text expressions cannot be executed by the value-index reader.",
    );
  }
  return expression;
};

const addPage = (
  context: ExecutionContext,
  ids: DocId[],
  hasContinuation: boolean,
): void => {
  context.backendPagesRead += 1;
  context.candidatesExamined += ids.length;
  if (
    context.backendPagesRead > context.limits.maxBackendPages ||
    context.candidatesExamined > context.limits.maxCandidates ||
    (hasContinuation &&
      context.candidatesExamined === context.limits.maxCandidates)
  ) {
    throw new IndexQueryError(
      IndexQueryErrorCode.BUDGET_EXCEEDED,
      "Indexed query exceeded its configured execution budget.",
    );
  }
};

const materializeValueExpression = async (
  expression: IndexExpression,
  context: ExecutionContext,
): Promise<MaterializedCandidates> => {
  const ids: DocId[] = [];
  let cursor: string | undefined;
  do {
    const remaining = context.limits.maxCandidates - context.candidatesExamined;
    if (remaining <= 0) {
      throw new IndexQueryError(
        IndexQueryErrorCode.BUDGET_EXCEEDED,
        "Indexed query exceeded its candidate budget.",
      );
    }
    const page = await searchStructured(
      context.backend.values,
      toWhere(expression),
      {
        limit: Math.min(250, remaining),
        cursor,
        orderBy: context.options.orderBy,
        occupancyFields: context.options.occupancyFields,
      },
    );
    cursor = page.cursor;
    addPage(context, page.candidateIds, !!cursor);
    ids.push(...page.candidateIds);
  } while (cursor);

  const firstLeaf = (() => {
    let current = expression;
    while (isBoolean(current)) {
      current = ("and" in current ? current.and : current.or)[0];
    }
    return current;
  })();
  return {
    ids,
    exact: true,
    driverKind: firstLeaf.type === "term" ? "term" : "range",
  };
};

const materializeTextExpression = async (
  expression: IndexTextExpression,
  context: ExecutionContext,
): Promise<MaterializedCandidates> => {
  if (!context.backend.text) {
    throw new IndexQueryError(
      IndexQueryErrorCode.UNSUPPORTED_EXPRESSION,
      "The indexed-query backend does not provide text capabilities.",
    );
  }

  const ids: DocId[] = [];
  let cursor: string | undefined;
  const useExact =
    expression.mode === "exact" ||
    expression.mode === "phrase" ||
    expression.mode === "caseInsensitiveEquals";
  const query =
    expression.mode === "prefix"
      ? `${expression.query.replace(/\*+$/g, "")}*`
      : expression.query;

  do {
    const remaining = context.limits.maxCandidates - context.candidatesExamined;
    if (remaining <= 0) {
      throw new IndexQueryError(
        IndexQueryErrorCode.BUDGET_EXCEEDED,
        "Indexed query exceeded its candidate budget.",
      );
    }
    const page = useExact
      ? await searchExact({
          backend: context.backend.text,
          query,
          indexField: expression.field,
          limit: Math.min(250, remaining),
          cursor,
          limits: {
            ...SEARCH_DEFAULTS,
            maxTokens: context.limits.maxTextTokens,
          },
        })
      : await searchLossy({
          backend: context.backend.text,
          query,
          indexField: expression.field,
          limit: Math.min(250, remaining),
          cursor,
          limits: {
            ...SEARCH_DEFAULTS,
            maxTokens: context.limits.maxTextTokens,
          },
        });
    cursor = page.nextCursor;
    addPage(context, page.docIds, !!cursor);
    ids.push(...page.docIds);
  } while (cursor);

  return { ids, exact: false, driverKind: "text" };
};

const intersect = (left: DocId[], right: DocId[]): DocId[] => {
  const rightIds = new Set(right);
  return left.filter((id) => rightIds.has(id));
};

const union = (children: DocId[][]): DocId[] => {
  const seen = new Set<DocId>();
  const ids: DocId[] = [];
  for (const child of children) {
    for (const id of child) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }
  return ids;
};

const materializeExpression = async (
  expression: IndexExpression,
  context: ExecutionContext,
): Promise<MaterializedCandidates> => {
  if (isValueExpression(expression)) {
    return materializeValueExpression(expression, context);
  }
  if (isText(expression)) {
    return materializeTextExpression(expression, context);
  }

  const booleanExpression = expression as
    { and: IndexExpression[] } | { or: IndexExpression[] };
  const children =
    "and" in booleanExpression ? booleanExpression.and : booleanExpression.or;
  const orderedChildren =
    "and" in booleanExpression && context.options.orderBy
      ? [
          ...children.filter(isValueExpression),
          ...children.filter((child) => !isValueExpression(child)),
        ]
      : children;
  const results: MaterializedCandidates[] = [];
  for (const child of orderedChildren) {
    results.push(await materializeExpression(child, context));
  }
  const ids =
    "and" in booleanExpression
      ? results
          .slice(1)
          .reduce(
            (current, child) => intersect(current, child.ids),
            results[0]?.ids ?? [],
          )
      : union(results.map((child) => child.ids));
  const driver = results.reduce<MaterializedCandidates | undefined>(
    (selected, child) =>
      !selected || child.ids.length < selected.ids.length ? child : selected,
    undefined,
  ) ?? { ids: [], exact: true, driverKind: "term" };
  return {
    ids,
    exact: results.every((child) => child.exact),
    driverKind: driver.driverKind,
  };
};

const validateExpression = (
  expression: IndexExpression,
  limits: IndexSearchLimits,
): void => {
  let leaves = 0;
  let orBranches = 0;
  const visit = (node: IndexExpression, depth: number): void => {
    if (depth > limits.maxExpressionDepth) {
      throw new IndexQueryError(
        IndexQueryErrorCode.BUDGET_EXCEEDED,
        "Indexed query exceeds the maximum expression depth.",
      );
    }
    if (isBoolean(node)) {
      const children = "and" in node ? node.and : node.or;
      if (children.length === 0) {
        throw new IndexQueryError(
          IndexQueryErrorCode.UNSUPPORTED_EXPRESSION,
          "Indexed Boolean expressions cannot be empty.",
        );
      }
      if ("or" in node) {
        orBranches += children.length;
      }
      children.forEach((child) => visit(child, depth + 1));
      return;
    }
    if (
      isText(node) &&
      node.query.split(/\s+/).filter(Boolean).length > limits.maxTextTokens
    ) {
      throw new IndexQueryError(
        IndexQueryErrorCode.BUDGET_EXCEEDED,
        "Indexed text query exceeds the configured token budget.",
      );
    }
    leaves += 1;
  };
  visit(expression, 1);
  if (leaves > limits.maxLeafCount || orBranches > limits.maxOrBranches) {
    throw new IndexQueryError(
      IndexQueryErrorCode.BUDGET_EXCEEDED,
      "Indexed query exceeds its configured expression budget.",
    );
  }
};

const collectKinds = (
  expression: IndexExpression,
): IndexSearchDiagnostics["expressionKinds"] => {
  const kinds = new Set<IndexSearchDiagnostics["expressionKinds"][number]>();
  const visit = (node: IndexExpression): void => {
    if ("and" in node) {
      kinds.add("and");
      node.and.forEach(visit);
    } else if ("or" in node) {
      kinds.add("or");
      node.or.forEach(visit);
    } else {
      kinds.add(node.type);
    }
  };
  visit(expression);
  return Array.from(kinds);
};

const sortCandidates = async (
  ids: DocId[],
  context: ExecutionContext,
): Promise<DocId[]> => {
  const { orderBy } = context.options;
  if (!orderBy) {
    return [...ids].sort(compareDocId);
  }
  if (!context.backend.values.documents) {
    throw new IndexQueryError(
      IndexQueryErrorCode.UNSUPPORTED_ORDER,
      "Globally ordered indexed queries require canonical value documents.",
    );
  }
  const values = new Map<DocId, unknown>();
  await Promise.all(
    ids.map(async (id) => {
      values.set(
        id,
        (await context.backend.values.documents?.get(id))?.[orderBy.field],
      );
    }),
  );
  return [...ids].sort((left, right) => {
    const leftValue = values.get(left);
    const rightValue = values.get(right);
    if (leftValue === undefined && rightValue !== undefined) return 1;
    if (leftValue !== undefined && rightValue === undefined) return -1;
    if (leftValue !== rightValue) {
      const comparison = String(leftValue).localeCompare(
        String(rightValue),
        undefined,
        {
          numeric: true,
        },
      );
      return orderBy.reverse ? -comparison : comparison;
    }
    return compareDocId(left, right);
  });
};

/**
 * Execute every indexable leaf through one logical Boolean query engine.
 *
 * Candidate sets are consumed atomically within explicit budgets, which keeps
 * the public cursor compact and deterministic. A budget overflow fails
 * explicitly; it never returns a partial logical result.
 */
export const searchIndex = async (
  backend: IndexBackend,
  expression: IndexExpression,
  options: IndexSearchOptions = {},
): Promise<IndexCandidatePage> => {
  const limits = { ...DEFAULT_INDEX_SEARCH_LIMITS, ...options.limits };
  validateExpression(expression, limits);
  const generation = await backend.values.occupancy?.getActiveGeneration();
  const queryFingerprint = fingerprintIndexQuery(expression);
  const planFingerprint = fingerprintIndexQuery({
    orderBy: options.orderBy,
    occupancyFields: options.occupancyFields,
    tokenizer: options.tokenizer,
    generation,
    parts: options.planFingerprintParts,
  });
  const decoded = decodeIndexSearchCursor(options.cursor, limits);
  if (
    decoded &&
    (decoded.queryFingerprint !== queryFingerprint ||
      decoded.planFingerprint !== planFingerprint)
  ) {
    throw new IndexQueryError(
      IndexQueryErrorCode.STALE_CURSOR,
      "Indexed-query cursor does not match the current query plan.",
    );
  }

  const context: ExecutionContext = {
    backend,
    options,
    limits,
    backendPagesRead: 0,
    candidatesExamined: 0,
  };
  const result = await materializeExpression(expression, context);
  const candidates = await sortCandidates(result.ids, context);
  const offset = decoded?.offset ?? 0;
  const limit = Math.max(1, options.limit ?? 10);
  const candidateIds = candidates.slice(offset, offset + limit);
  const nextOffset = offset + candidateIds.length;
  const cursor =
    nextOffset < candidates.length
      ? encodeIndexSearchCursor(
          {
            version: INDEX_SEARCH_CURSOR_VERSION,
            queryFingerprint,
            planFingerprint,
            order: options.orderBy,
            offset: nextOffset,
          },
          limits,
        )
      : undefined;
  const kinds = collectKinds(expression);
  return {
    candidateIds,
    cursor,
    requiresCanonicalVerification: !result.exact,
    diagnostics: {
      expressionKinds: kinds,
      driverKind: result.driverKind,
      mixed:
        kinds.includes("text") &&
        (kinds.includes("term") ||
          kinds.includes("between") ||
          kinds.includes("gte") ||
          kinds.includes("lte")),
      requiresCanonicalVerification: !result.exact,
      strategy:
        "and" in expression
          ? "candidateIntersection"
          : "or" in expression
            ? "candidateUnion"
            : "singleLeaf",
      candidatesExamined: context.candidatesExamined,
      backendPagesRead: context.backendPagesRead,
    },
  };
};
