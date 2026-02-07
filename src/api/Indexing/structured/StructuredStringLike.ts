import type { WhereValue } from "./Types";

const MAX_INDEXED_STRING_LENGTH = 128;
const MAX_TOKENS_PER_VALUE = 256;
const MAX_NGRAM_SIZE = 3;
const LIKE_WILDCARD_REGEX = /[%_]/;
const NORMALIZED_WHITESPACE_REGEX = /\s+/g;

/**
 * Prefix marker for structured string contains tokens.
 */
export const STRUCTURED_STRING_CONTAINS_TOKEN_PREFIX = "__str__:";

/**
 * Normalize a string for structured LIKE matching.
 * - lowercase
 * - trim
 * - collapse internal whitespace
 */
export const normalizeStructuredLikeString = (value: string): string =>
  value.toLowerCase().trim().replace(NORMALIZED_WHITESPACE_REGEX, " ");

const toNgrams = (normalized: string): string[] => {
  const tokens: string[] = [];
  const seen = new Set<string>();
  const limited = normalized.slice(0, MAX_INDEXED_STRING_LENGTH);

  for (let size = 1; size <= MAX_NGRAM_SIZE; size += 1) {
    if (limited.length < size) {
      break;
    }

    for (let index = 0; index <= limited.length - size; index += 1) {
      const token = limited.slice(index, index + size);
      if (!seen.has(token)) {
        seen.add(token);
        tokens.push(token);
        if (tokens.length >= MAX_TOKENS_PER_VALUE) {
          return tokens;
        }
      }
    }
  }

  return tokens;
};

const toContainsToken = (token: string): string =>
  `${STRUCTURED_STRING_CONTAINS_TOKEN_PREFIX}${token}`;

/**
 * Build contains tokens for an indexed structured string field value.
 */
export const buildStructuredStringContainsTokens = (
  value: string,
): string[] => {
  const normalized = normalizeStructuredLikeString(value);
  if (!normalized.length) {
    return [];
  }

  return toNgrams(normalized).map(toContainsToken);
};

/**
 * Build contains tokens for a SQL-like pattern. `%` and `_` are wildcard
 * markers; when no wildcard exists, value behaves as `%value%`.
 */
export const buildStructuredLikePatternTokens = (
  value: string,
): string[] => {
  const normalized = normalizeStructuredLikeString(value);
  const pattern = LIKE_WILDCARD_REGEX.test(normalized)
    ? normalized
    : `%${normalized}%`;
  const literalSegments = pattern
    .split(LIKE_WILDCARD_REGEX)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const tokens: string[] = [];
  const seen = new Set<string>();

  for (const segment of literalSegments) {
    for (const token of toNgrams(segment)) {
      const containsToken = toContainsToken(token);
      if (!seen.has(containsToken)) {
        seen.add(containsToken);
        tokens.push(containsToken);
        if (tokens.length >= MAX_TOKENS_PER_VALUE) {
          return tokens;
        }
      }
    }
  }

  return tokens;
};

/**
 * True when this contains query value is a generated string token.
 */
export const isStructuredStringContainsToken = (
  value: WhereValue,
): value is string =>
  typeof value === "string" &&
  value.startsWith(STRUCTURED_STRING_CONTAINS_TOKEN_PREFIX);
