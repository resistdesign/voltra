import type { DocId } from "../Types";
import type { StructuredDocFieldsRecord } from "./StructuredDdb";
import {
  decodeStructuredSearchCursor,
  encodeStructuredSearchCursor,
  type StructuredSearchCursorState,
} from "./StructuredSearchCursor";
import {
  buildStructuredStringContainsTokens,
  type StructuredStringTokenizerConfig,
} from "./StructuredStringLike";
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
    return [
      {
        leaf: firstLeaf(where),
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
  const state = decodeStructuredSearchCursor(options.cursor) ?? {
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
  };
}
