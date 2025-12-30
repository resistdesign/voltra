/**
 * Optional limits for search execution.
 */
export type SearchLimits = {
  /**
   * Maximum number of tokens processed for a query.
   */
  maxTokens?: number;
  /**
   * Maximum number of postings pages fetched.
   */
  maxPostingsPages?: number;
  /**
   * Maximum number of candidates verified for exact matches.
   */
  maxCandidatesVerified?: number;
  /**
   * Soft time budget in milliseconds before stopping.
   */
  softTimeBudgetMs?: number;
};

/**
 * Fully resolved search limits with defaults applied.
 */
export type ResolvedSearchLimits = Required<SearchLimits>;

/**
 * Default search limits applied when none are provided.
 */
export const SEARCH_DEFAULTS: ResolvedSearchLimits = {
  maxTokens: 6,
  maxPostingsPages: 4,
  maxCandidatesVerified: 200,
  softTimeBudgetMs: 150,
};

/**
 * Maximum caps enforced for requested search limits.
 */
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

/**
 * Resolve and clamp search limits against defaults and caps.
 * @param limits Optional requested limits to apply.
 * @returns Resolved and clamped limits.
 */
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
