import type { WhereValue } from "./Types";

const DEFAULT_MAX_INDEXED_STRING_LENGTH = 128;
const DEFAULT_MAX_TOKENS_PER_VALUE = 256;
const DEFAULT_MIN_NGRAM_SIZE = 1;
const DEFAULT_MAX_NGRAM_SIZE = 3;
const LIKE_WILDCARD_REGEX = /[%_]/;
const NORMALIZED_WHITESPACE_REGEX = /\s+/g;

/**
 * Prefix marker for structured string contains tokens.
 */
export const STRUCTURED_STRING_CONTAINS_TOKEN_PREFIX = "__str__:";

/**
 * Tokenizer settings for structured string contains/LIKE behavior.
 */
export type StructuredStringTokenizerConfig = {
  /**
   * Minimum ngram size to generate.
   */
  minNgramSize: number;
  /**
   * Maximum ngram size to generate.
   */
  maxNgramSize: number;
  /**
   * Maximum source string length to tokenize.
   */
  maxIndexedStringLength: number;
  /**
   * Maximum number of tokens emitted per value.
   */
  maxTokensPerValue: number;
};

/**
 * Safe defaults that preserve current behavior.
 */
export const DEFAULT_STRUCTURED_STRING_TOKENIZER_CONFIG: StructuredStringTokenizerConfig =
  {
    minNgramSize: DEFAULT_MIN_NGRAM_SIZE,
    maxNgramSize: DEFAULT_MAX_NGRAM_SIZE,
    maxIndexedStringLength: DEFAULT_MAX_INDEXED_STRING_LENGTH,
    maxTokensPerValue: DEFAULT_MAX_TOKENS_PER_VALUE,
  };

const clampInteger = (
  value: number | undefined,
  fallback: number,
  minimum = 1,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, Math.floor(value));
};

/**
 * Resolve tokenizer config with validation and sane defaults.
 */
export const resolveStructuredStringTokenizerConfig = (
  config?: Partial<StructuredStringTokenizerConfig>,
): StructuredStringTokenizerConfig => {
  const minNgramSize = clampInteger(
    config?.minNgramSize,
    DEFAULT_STRUCTURED_STRING_TOKENIZER_CONFIG.minNgramSize,
  );
  const maxNgramSize = clampInteger(
    config?.maxNgramSize,
    DEFAULT_STRUCTURED_STRING_TOKENIZER_CONFIG.maxNgramSize,
  );

  return {
    minNgramSize: Math.min(minNgramSize, maxNgramSize),
    maxNgramSize: Math.max(minNgramSize, maxNgramSize),
    maxIndexedStringLength: clampInteger(
      config?.maxIndexedStringLength,
      DEFAULT_STRUCTURED_STRING_TOKENIZER_CONFIG.maxIndexedStringLength,
    ),
    maxTokensPerValue: clampInteger(
      config?.maxTokensPerValue,
      DEFAULT_STRUCTURED_STRING_TOKENIZER_CONFIG.maxTokensPerValue,
    ),
  };
};

/**
 * Normalize a string for structured LIKE matching.
 * - lowercase
 * - trim
 * - collapse internal whitespace
 */
export const normalizeStructuredLikeString = (value: string): string =>
  value.toLowerCase().trim().replace(NORMALIZED_WHITESPACE_REGEX, " ");

const toNgrams = (
  normalized: string,
  config: StructuredStringTokenizerConfig,
): string[] => {
  const tokens: string[] = [];
  const seen = new Set<string>();
  const limited = Array.from(normalized).slice(
    0,
    config.maxIndexedStringLength,
  );

  for (let size = config.minNgramSize; size <= config.maxNgramSize; size += 1) {
    if (limited.length < size) {
      break;
    }

    for (let index = 0; index <= limited.length - size; index += 1) {
      const token = limited.slice(index, index + size).join("");
      if (!seen.has(token)) {
        seen.add(token);
        tokens.push(token);
        if (tokens.length >= config.maxTokensPerValue) {
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
  tokenizerConfig?: Partial<StructuredStringTokenizerConfig>,
): string[] => {
  const config = resolveStructuredStringTokenizerConfig(tokenizerConfig);
  const normalized = normalizeStructuredLikeString(value);
  if (!normalized.length) {
    return [];
  }

  return toNgrams(normalized, config).map(toContainsToken);
};

/**
 * Build contains tokens for a SQL-like pattern. `%` and `_` are wildcard
 * markers; when no wildcard exists, value behaves as `%value%`.
 */
export const buildStructuredLikePatternTokens = (
  value: string,
  tokenizerConfig?: Partial<StructuredStringTokenizerConfig>,
): string[] => {
  const config = resolveStructuredStringTokenizerConfig(tokenizerConfig);
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
    for (const token of toNgrams(segment, config)) {
      const containsToken = toContainsToken(token);
      if (!seen.has(containsToken)) {
        seen.add(containsToken);
        tokens.push(containsToken);
        if (tokens.length >= config.maxTokensPerValue) {
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
