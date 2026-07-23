import type { DocId } from "../Types";
import type { StructuredDocFieldsRecord } from "./StructuredDdb";
import {
  decodeStructuredSearchCursor,
  encodeStructuredSearchCursor,
  type StructuredOccupancyCursorState,
  type StructuredSearchCursorState,
} from "./StructuredSearchCursor";
import {
  STRUCTURED_OCCUPANCY_CELL_BUDGET,
  STRUCTURED_OCCUPANCY_PAGE_BUDGET,
  STRUCTURED_OCCUPANCY_PAGE_SIZE,
  buildStructuredChunkBounds,
  isStructuredOccupancyFieldValue,
  type StructuredOccupancyPage,
} from "./StructuredOccupancy";
import {
  buildStructuredStringContainsTokens,
  type StructuredStringTokenizerConfig,
} from "./StructuredStringLike";
import { STRUCTURED_OPTIONAL_ORDER_REQUIRES_OCCUPANCY } from "./Types";
import type {
  CandidatePage,
  StructuredQueryOptions,
  StructuredRangeWhere,
  StructuredSearchOptions,
  StructuredTermWhere,
  Where,
  WhereValue,
} from "./Types";

type BackendCandidatePage = {
  candidateIds: DocId[];
  lastEvaluatedKey?: string;
};

type StructuredTermIndex = {
  query(
    field: string,
    mode: StructuredTermWhere["mode"],
    value: WhereValue,
    options?: StructuredQueryOptions,
  ): Promise<BackendCandidatePage>;
};

type StructuredRangeIndex = {
  between(
    field: string,
    lower: WhereValue,
    upper: WhereValue,
    options?: StructuredQueryOptions,
  ): Promise<BackendCandidatePage>;
  gte(
    field: string,
    lower: WhereValue,
    options?: StructuredQueryOptions,
  ): Promise<BackendCandidatePage>;
  lte(
    field: string,
    upper: WhereValue,
    options?: StructuredQueryOptions,
  ): Promise<BackendCandidatePage>;
  all(
    field: string,
    options?: StructuredQueryOptions,
  ): Promise<BackendCandidatePage>;
};

type StructuredOccupancyIndex = {
  getActiveGeneration(): Promise<string | undefined>;
  query(
    generation: string,
    criterionField: string,
    sortField: string,
    lowerChunk: string,
    upperChunk: string,
    options?: StructuredQueryOptions,
  ): Promise<StructuredOccupancyPage>;
};

type StructuredMissingIndex = {
  all(
    generation: string,
    sortField: string,
    options?: StructuredQueryOptions,
  ): Promise<BackendCandidatePage>;
};

/** Dependencies required to run structured searches. */
export type StructuredSearchDependencies = {
  /** Term query dependency for equality/contains lookups. */
  terms: StructuredTermIndex;
  /** Range and globally ordered field traversal dependency. */
  ranges: StructuredRangeIndex;
  /** Canonical structured fields used for exact candidate verification. */
  documents?: {
    get(docId: DocId): Promise<StructuredDocFieldsRecord | undefined>;
  };
  /** Tokenizer used by string contains/LIKE verification. */
  tokenizer?: Partial<StructuredStringTokenizerConfig>;
  /** Sparse Link & Lock occupancy metadata, when supported by the backend. */
  occupancy?: StructuredOccupancyIndex;
  /** Deterministic missing-sort stream, when supported by the backend. */
  missing?: StructuredMissingIndex;
};

type CandidateSource = {
  leaf: StructuredTermWhere | StructuredRangeWhere;
  owner: Where;
  orderBy?: { field: string; reverse?: boolean };
};

const isLeaf = (
  where: Where,
): where is StructuredTermWhere | StructuredRangeWhere => "type" in where;

const firstLeaf = (
  where: Where,
): StructuredTermWhere | StructuredRangeWhere => {
  if (isLeaf(where)) {
    return where;
  }

  const children = "and" in where ? where.and : where.or;
  if (children.length === 0) {
    throw new Error("Structured compound criteria cannot be empty.");
  }
  return firstLeaf(children[0]);
};

const findDirectOrderLeaf = (
  where: Where,
  field: string,
): StructuredTermWhere | StructuredRangeWhere | undefined => {
  if (isLeaf(where)) {
    return where.field === field &&
      (where.type !== "term" || where.mode === "eq")
      ? where
      : undefined;
  }
  if ("or" in where) {
    return undefined;
  }
  for (const child of where.and) {
    const leaf = findDirectOrderLeaf(child, field);
    if (leaf) {
      return leaf;
    }
  }
  return undefined;
};

const toConjunctiveBranches = (where: Where): Where[][] => {
  if (isLeaf(where)) {
    return [[where]];
  }
  if ("or" in where) {
    return where.or.flatMap(toConjunctiveBranches);
  }

  let branches: Where[][] = [[]];
  for (const child of where.and) {
    const childBranches = toConjunctiveBranches(child);
    branches = branches.flatMap((branch) =>
      childBranches.map((childBranch) => [...branch, ...childBranch]),
    );
    if (branches.length > 256) {
      throw new Error(
        "Structured criteria expand to too many candidate sources.",
      );
    }
  }
  return branches;
};

const branchWhere = (branch: Where[]): Where =>
  branch.length === 1 ? branch[0] : { and: branch };

const buildSources = (
  where: Where,
  options: StructuredSearchOptions,
): CandidateSource[] => {
  if (options.orderBy) {
    const directLeaf = findDirectOrderLeaf(where, options.orderBy.field);
    return [
      {
        leaf: directLeaf ?? firstLeaf(where),
        owner: where,
        orderBy: options.orderBy,
      },
    ];
  }

  return toConjunctiveBranches(where)
    .filter((branch) => branch.length > 0)
    .map((branch) => {
      const owner = branchWhere(branch);
      return { leaf: firstLeaf(owner), owner };
    });
};

const compareValues = (left: WhereValue, right: WhereValue): number => {
  if (typeof left === "number" && typeof right === "number") {
    return left === right ? 0 : left < right ? -1 : 1;
  }
  const leftString = String(left);
  const rightString = String(right);
  return leftString === rightString ? 0 : leftString < rightString ? -1 : 1;
};

const matchesTerm = (
  where: StructuredTermWhere,
  fields: StructuredDocFieldsRecord,
  tokenizer?: Partial<StructuredStringTokenizerConfig>,
): boolean => {
  const value = fields[where.field];

  if (where.mode === "eq") {
    return !Array.isArray(value) && value === where.value;
  }

  if (Array.isArray(value)) {
    return value.includes(where.value);
  }
  if (typeof value === "string") {
    return buildStructuredStringContainsTokens(value, tokenizer).includes(
      String(where.value),
    );
  }
  return false;
};

const matchesRange = (
  where: StructuredRangeWhere,
  fields: StructuredDocFieldsRecord,
): boolean => {
  const value = fields[where.field];
  if (Array.isArray(value) || value === undefined) {
    return false;
  }

  if (where.type === "between") {
    return (
      compareValues(value, where.lower) >= 0 &&
      compareValues(value, where.upper) <= 0
    );
  }
  return where.type === "gte"
    ? compareValues(value, where.value) >= 0
    : compareValues(value, where.value) <= 0;
};

const matchesWhere = (
  where: Where,
  fields: StructuredDocFieldsRecord,
  tokenizer?: Partial<StructuredStringTokenizerConfig>,
): boolean => {
  if ("and" in where) {
    return where.and.every((child) => matchesWhere(child, fields, tokenizer));
  }
  if ("or" in where) {
    return where.or.some((child) => matchesWhere(child, fields, tokenizer));
  }
  return where.type === "term"
    ? matchesTerm(where, fields, tokenizer)
    : matchesRange(where, fields);
};

const readSourcePage = async (
  dependencies: StructuredSearchDependencies,
  source: CandidateSource,
  cursor: string | undefined,
  limit: number,
): Promise<BackendCandidatePage> => {
  const options: StructuredQueryOptions = {
    cursor,
    limit,
    reverse: source.orderBy?.reverse,
  };

  if (source.orderBy) {
    if (source.leaf.field === source.orderBy.field) {
      if (source.leaf.type === "term" && source.leaf.mode === "eq") {
        return dependencies.ranges.between(
          source.leaf.field,
          source.leaf.value,
          source.leaf.value,
          options,
        );
      }
      if (source.leaf.type === "between") {
        return dependencies.ranges.between(
          source.leaf.field,
          source.leaf.lower,
          source.leaf.upper,
          options,
        );
      }
      if (source.leaf.type === "gte") {
        return dependencies.ranges.gte(
          source.leaf.field,
          source.leaf.value,
          options,
        );
      }
      if (source.leaf.type === "lte") {
        return dependencies.ranges.lte(
          source.leaf.field,
          source.leaf.value,
          options,
        );
      }
    }
    return dependencies.ranges.all(source.orderBy.field, options);
  }
  if (source.leaf.type === "term") {
    return dependencies.terms.query(
      source.leaf.field,
      source.leaf.mode,
      source.leaf.value,
      options,
    );
  }
  if (source.leaf.type === "between") {
    return dependencies.ranges.between(
      source.leaf.field,
      source.leaf.lower,
      source.leaf.upper,
      options,
    );
  }
  return source.leaf.type === "gte"
    ? dependencies.ranges.gte(source.leaf.field, source.leaf.value, options)
    : dependencies.ranges.lte(source.leaf.field, source.leaf.value, options);
};

const hasContinuation = (
  state: StructuredSearchCursorState,
  sourceCount: number,
): boolean => state.readyDocIds.length > 0 || state.sourceIndex < sourceCount;

type OccupancyPlanContext = {
  dependencies: StructuredSearchDependencies;
  options: StructuredSearchOptions;
  generation: string;
  sortField: string;
  cellsRead: number;
  pagesRead: number;
};

type OccupancyTokenPlan = Map<string, string | number>;

class OccupancyBudgetExceededError extends Error {}

const intersectTokenPlans = (
  left: OccupancyTokenPlan,
  right: OccupancyTokenPlan,
): OccupancyTokenPlan =>
  new Map(Array.from(left).filter(([token]) => right.has(token)));

const unionTokenPlans = (plans: OccupancyTokenPlan[]): OccupancyTokenPlan => {
  const combined = new Map<string, string | number>();
  for (const plan of plans) {
    for (const [token, value] of plan) {
      combined.set(token, value);
    }
  }
  return combined;
};

const readLeafOccupancy = async (
  leaf: StructuredTermWhere | StructuredRangeWhere,
  context: OccupancyPlanContext,
): Promise<OccupancyTokenPlan | undefined> => {
  const fieldConfig = context.options.occupancyFields?.[leaf.field];
  if (
    !fieldConfig ||
    leaf.field === context.sortField ||
    (leaf.type === "term" && leaf.mode !== "eq")
  ) {
    return undefined;
  }

  let lower: string | number | undefined;
  let upper: string | number | undefined;
  if (leaf.type === "term") {
    if (typeof leaf.value !== fieldConfig.type) {
      return undefined;
    }
    lower = leaf.value as string | number;
    upper = lower;
  } else if (leaf.type === "between") {
    if (
      typeof leaf.lower !== fieldConfig.type ||
      typeof leaf.upper !== fieldConfig.type
    ) {
      return undefined;
    }
    lower = leaf.lower as string | number;
    upper = leaf.upper as string | number;
  } else {
    const value = leaf.value;
    if (typeof value !== fieldConfig.type) {
      return undefined;
    }
    if (leaf.type === "gte") {
      lower = value as string | number;
    } else {
      upper = value as string | number;
    }
  }

  const bounds = buildStructuredChunkBounds(lower, upper, fieldConfig);
  const plan = new Map<string, string | number>();
  let cursor: string | undefined;
  do {
    const page = await context.dependencies.occupancy?.query(
      context.generation,
      leaf.field,
      context.sortField,
      bounds.lower,
      bounds.upper,
      { cursor, limit: STRUCTURED_OCCUPANCY_PAGE_SIZE },
    );
    if (!page) {
      return undefined;
    }
    context.pagesRead += 1;
    context.cellsRead += page.cells.length;
    if (
      context.cellsRead > STRUCTURED_OCCUPANCY_CELL_BUDGET ||
      context.pagesRead > STRUCTURED_OCCUPANCY_PAGE_BUDGET
    ) {
      throw new OccupancyBudgetExceededError();
    }
    for (const cell of page.cells) {
      plan.set(cell.sortToken, cell.sortValue);
    }
    cursor = page.cursor;
  } while (cursor);
  return plan;
};

const buildOccupancyPlan = async (
  where: Where,
  context: OccupancyPlanContext,
): Promise<OccupancyTokenPlan | undefined> => {
  if (isLeaf(where)) {
    return readLeafOccupancy(where, context);
  }

  if ("or" in where) {
    const plans = await Promise.all(
      where.or.map((child) => buildOccupancyPlan(child, context)),
    );
    return plans.some((plan) => !plan)
      ? undefined
      : unionTokenPlans(plans as OccupancyTokenPlan[]);
  }

  const plans = (
    await Promise.all(
      where.and.map((child) => buildOccupancyPlan(child, context)),
    )
  ).filter((plan): plan is OccupancyTokenPlan => !!plan);
  if (plans.length === 0) {
    return undefined;
  }
  return plans.slice(1).reduce(intersectTokenPlans, plans[0]);
};

const nextTokenIndex = (
  tokens: Array<[string, string | number]>,
  cursor: StructuredOccupancyCursorState,
  reverse: boolean,
): number => {
  if (!cursor.sortToken) {
    return 0;
  }
  const exact = tokens.findIndex(([token]) => token === cursor.sortToken);
  if (cursor.blockCursor && exact >= 0) {
    return exact;
  }
  if (exact >= 0) {
    return exact + 1;
  }
  return tokens.findIndex(([token]) =>
    reverse ? token < cursor.sortToken! : token > cursor.sortToken!,
  );
};

const matchesMissingCandidate = async (
  dependencies: StructuredSearchDependencies,
  where: Where,
  options: StructuredSearchOptions,
  docId: DocId,
): Promise<boolean> => {
  const sortField = options.orderBy?.field;
  const sortConfig = sortField
    ? options.occupancyFields?.[sortField]
    : undefined;
  const fields = await dependencies.documents?.get(docId);
  return !!(
    fields &&
    sortField &&
    sortConfig &&
    !isStructuredOccupancyFieldValue(fields[sortField], sortConfig) &&
    matchesWhere(where, fields, dependencies.tokenizer)
  );
};

const findMissingContinuation = async (
  dependencies: StructuredSearchDependencies,
  where: Where,
  options: StructuredSearchOptions,
  generation: string,
  cursor?: string,
): Promise<{ found: boolean; cursor?: string }> => {
  let next = cursor;
  while (true) {
    const resume = next;
    const page = await dependencies.missing!.all(
      generation,
      options.orderBy!.field,
      { limit: 1, cursor: next },
    );
    const docId = page.candidateIds[0];
    if (
      docId !== undefined &&
      (await matchesMissingCandidate(dependencies, where, options, docId))
    ) {
      return { found: true, ...(resume ? { cursor: resume } : {}) };
    }
    next = page.lastEvaluatedKey;
    if (!next) {
      return { found: false };
    }
  }
};

const searchWithOccupancy = async (
  dependencies: StructuredSearchDependencies,
  where: Where,
  options: StructuredSearchOptions,
  decodedCursor: StructuredOccupancyCursorState | undefined,
): Promise<
  | { page: CandidatePage }
  | { fallbackReason: "unsupported" | "budget" | "unavailable" }
> => {
  if (
    !options.orderBy ||
    !options.occupancyFields ||
    !dependencies.occupancy ||
    !dependencies.missing ||
    !dependencies.documents
  ) {
    return { fallbackReason: "unavailable" };
  }
  const generation = await dependencies.occupancy.getActiveGeneration();
  if (decodedCursor && decodedCursor.generation !== generation) {
    return {
      page: {
        candidateIds: [],
        diagnostics: {
          strategy: "occupancy",
          occupancyCellsRead: 0,
          occupancyPagesRead: 0,
          occupiedSortTokens: 0,
        },
      },
    };
  }
  if (!generation) {
    return { fallbackReason: "unavailable" };
  }

  const planContext: OccupancyPlanContext = {
    dependencies,
    options,
    generation,
    sortField: options.orderBy.field,
    cellsRead: 0,
    pagesRead: 0,
  };
  let plan: OccupancyTokenPlan | undefined;
  try {
    plan = await buildOccupancyPlan(where, planContext);
  } catch (error) {
    if (error instanceof OccupancyBudgetExceededError) {
      return { fallbackReason: "budget" };
    }
    throw error;
  }
  if (!plan) {
    return { fallbackReason: "unsupported" };
  }

  const reverse = !!options.orderBy.reverse;
  const tokens = Array.from(plan).sort(([left], [right]) =>
    left < right ? (reverse ? 1 : -1) : left > right ? (reverse ? -1 : 1) : 0,
  );
  const limit = Math.max(1, options.limit ?? 10);
  const results: DocId[] = [];
  let cursor: StructuredOccupancyCursorState = decodedCursor ?? {
    mode: "occupancy",
    generation,
    phase: "present",
  };

  if (cursor.phase === "present") {
    let index = nextTokenIndex(tokens, cursor, reverse);
    while (index >= 0 && index < tokens.length && results.length < limit) {
      const [sortToken, sortValue] = tokens[index];
      const sameToken = cursor.sortToken === sortToken;
      const page = await dependencies.ranges.between(
        options.orderBy.field,
        sortValue,
        sortValue,
        {
          limit: limit - results.length,
          cursor: sameToken ? cursor.blockCursor : undefined,
          reverse,
        },
      );
      for (const docId of page.candidateIds) {
        const fields = await dependencies.documents.get(docId);
        if (fields && matchesWhere(where, fields, dependencies.tokenizer)) {
          results.push(docId);
        }
      }
      cursor = {
        mode: "occupancy",
        generation,
        phase: "present",
        sortToken,
        ...(page.lastEvaluatedKey
          ? { blockCursor: page.lastEvaluatedKey }
          : {}),
      };
      if (!page.lastEvaluatedKey) {
        index += 1;
      }
    }

    if (results.length >= limit) {
      const hasMorePresent = !!cursor.blockCursor || index < tokens.length;
      if (!hasMorePresent && !options.orderBy.optional) {
        return {
          page: {
            candidateIds: results,
            diagnostics: {
              strategy: "occupancy",
              occupancyCellsRead: planContext.cellsRead,
              occupancyPagesRead: planContext.pagesRead,
              occupiedSortTokens: tokens.length,
            },
          },
        };
      }
      if (!hasMorePresent) {
        const continuation = await findMissingContinuation(
          dependencies,
          where,
          options,
          generation,
        );
        if (!continuation.found) {
          return {
            page: {
              candidateIds: results,
              diagnostics: {
                strategy: "occupancy",
                occupancyCellsRead: planContext.cellsRead,
                occupancyPagesRead: planContext.pagesRead,
                occupiedSortTokens: tokens.length,
              },
            },
          };
        }
        cursor = {
          mode: "occupancy",
          generation,
          phase: "missing",
          ...(continuation.cursor ? { blockCursor: continuation.cursor } : {}),
        };
      }
      return {
        page: {
          candidateIds: results,
          cursor: encodeStructuredSearchCursor(cursor),
          diagnostics: {
            strategy: "occupancy",
            occupancyCellsRead: planContext.cellsRead,
            occupancyPagesRead: planContext.pagesRead,
            occupiedSortTokens: tokens.length,
          },
        },
      };
    }
    if (!options.orderBy.optional) {
      return {
        page: {
          candidateIds: results,
          diagnostics: {
            strategy: "occupancy",
            occupancyCellsRead: planContext.cellsRead,
            occupancyPagesRead: planContext.pagesRead,
            occupiedSortTokens: tokens.length,
          },
        },
      };
    }
    cursor = { mode: "occupancy", generation, phase: "missing" };
  }

  let missingCursor = cursor.blockCursor;
  while (results.length < limit) {
    const page = await dependencies.missing.all(
      generation,
      options.orderBy.field,
      { limit: limit - results.length, cursor: missingCursor },
    );
    for (const docId of page.candidateIds) {
      if (await matchesMissingCandidate(dependencies, where, options, docId)) {
        results.push(docId);
      }
    }
    missingCursor = page.lastEvaluatedKey;
    if (!missingCursor) {
      break;
    }
  }

  if (results.length >= limit && missingCursor) {
    const continuation = await findMissingContinuation(
      dependencies,
      where,
      options,
      generation,
      missingCursor,
    );
    missingCursor = continuation.found ? continuation.cursor : undefined;
  }

  return {
    page: {
      candidateIds: results,
      ...(missingCursor
        ? {
            cursor: encodeStructuredSearchCursor({
              mode: "occupancy",
              generation,
              phase: "missing",
              blockCursor: missingCursor,
            }),
          }
        : {}),
      diagnostics: {
        strategy: "occupancy",
        occupancyCellsRead: planContext.cellsRead,
        occupancyPagesRead: planContext.pagesRead,
        occupiedSortTokens: tokens.length,
      },
    },
  };
};

/** Execute a deterministic, bounded structured candidate composition plan. */
export async function searchStructured(
  dependencies: StructuredSearchDependencies,
  where: Where,
  options: StructuredSearchOptions = {},
): Promise<CandidatePage> {
  const limit = Math.max(1, options.limit ?? 10);
  const backendPageSize = Math.max(
    1,
    Math.min(options.backendPageSize ?? 100, 500),
  );
  const sources = buildSources(where, options);
  const decoded = decodeStructuredSearchCursor(options.cursor);
  const occupancyOutcome = await searchWithOccupancy(
    dependencies,
    where,
    options,
    decoded?.mode === "occupancy" ? decoded : undefined,
  );
  if ("page" in occupancyOutcome) {
    return occupancyOutcome.page;
  }
  if (
    options.orderBy?.optional &&
    !findDirectOrderLeaf(where, options.orderBy.field)
  ) {
    throw new Error(STRUCTURED_OPTIONAL_ORDER_REQUIRES_OCCUPANCY);
  }
  if (decoded?.mode === "occupancy") {
    throw new Error(
      "Structured occupancy cursor cannot use baseline traversal.",
    );
  }
  const state: StructuredSearchCursorState = decoded ?? {
    hits: [],
    sourceIndex: 0,
    readyDocIds: [],
  };

  if (
    state.sourceIndex > sources.length ||
    state.hits.length > sources.length
  ) {
    throw new Error("Structured search cursor does not match the query plan.");
  }

  const candidateIds = state.readyDocIds.splice(0, limit);

  while (candidateIds.length < limit && state.sourceIndex < sources.length) {
    const sourceIndex = state.sourceIndex;
    const source = sources[sourceIndex];
    const hit = state.hits[sourceIndex];

    if (hit?.next === null) {
      state.sourceIndex += 1;
      continue;
    }

    const page = await readSourcePage(
      dependencies,
      source,
      hit?.next,
      backendPageSize,
    );

    state.hits[sourceIndex] = { next: page.lastEvaluatedKey ?? null };
    if (!page.lastEvaluatedKey) {
      state.sourceIndex += 1;
    }

    const uniquePageIds = Array.from(new Set(page.candidateIds));
    const requiresVerification =
      !!source.orderBy || sources.length > 1 || !isLeaf(source.owner);

    for (const docId of uniquePageIds) {
      let qualifies = true;

      if (requiresVerification) {
        if (!dependencies.documents) {
          throw new Error(
            "Structured compound and ordered searches require document fields.",
          );
        }
        const fields = await dependencies.documents.get(docId);
        qualifies =
          !!fields &&
          matchesWhere(source.owner, fields, dependencies.tokenizer);

        if (qualifies && sources.length > 1 && fields) {
          qualifies = !sources
            .slice(0, sourceIndex)
            .some((earlier) =>
              matchesWhere(earlier.owner, fields, dependencies.tokenizer),
            );
        }
      }

      if (qualifies) {
        state.readyDocIds.push(docId);
      }
    }

    candidateIds.push(
      ...state.readyDocIds.splice(0, limit - candidateIds.length),
    );
  }

  return {
    candidateIds,
    cursor: hasContinuation(state, sources.length)
      ? encodeStructuredSearchCursor(state)
      : undefined,
    ...(options.orderBy && options.occupancyFields
      ? {
          diagnostics: {
            strategy: "baseline" as const,
            occupancyCellsRead: 0,
            occupancyPagesRead: 0,
            occupiedSortTokens: 0,
            fallbackReason: occupancyOutcome.fallbackReason,
          },
        }
      : {}),
  };
}
