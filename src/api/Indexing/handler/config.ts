export type SearchLimits = {
  maxTokens?: number;
  maxPostingsPages?: number;
  maxCandidatesVerified?: number;
  softTimeBudgetMs?: number;
};

export type ResolvedSearchLimits = Required<SearchLimits>;

export const SEARCH_DEFAULTS: ResolvedSearchLimits = {
  maxTokens: 6,
  maxPostingsPages: 4,
  maxCandidatesVerified: 200,
  softTimeBudgetMs: 150,
};

export const SEARCH_CAPS: ResolvedSearchLimits = {
  maxTokens: 12,
  maxPostingsPages: 12,
  maxCandidatesVerified: 1_000,
  softTimeBudgetMs: 500,
};

function clampLimit(value: number, fallback: number, cap: number): number {
  if (!Number.isFinite(value)) {
    return Math.min(fallback, cap);
  }

  const safeValue = Math.max(0, value);
  return Math.min(safeValue, cap);
}

export function resolveSearchLimits(limits?: SearchLimits): ResolvedSearchLimits {
  const requested = { ...SEARCH_DEFAULTS, ...limits };

  return {
    maxTokens: clampLimit(requested.maxTokens, SEARCH_DEFAULTS.maxTokens, SEARCH_CAPS.maxTokens),
    maxPostingsPages: clampLimit(
      requested.maxPostingsPages,
      SEARCH_DEFAULTS.maxPostingsPages,
      SEARCH_CAPS.maxPostingsPages,
    ),
    maxCandidatesVerified: clampLimit(
      requested.maxCandidatesVerified,
      SEARCH_DEFAULTS.maxCandidatesVerified,
      SEARCH_CAPS.maxCandidatesVerified,
    ),
    softTimeBudgetMs: clampLimit(requested.softTimeBudgetMs, SEARCH_DEFAULTS.softTimeBudgetMs, SEARCH_CAPS.softTimeBudgetMs),
  };
}
