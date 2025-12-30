/**
 * Tokenization output with a normalized string and its tokens.
 * */
export type TokenizationResult = {
  /**
   * Normalized input string used to produce tokens.
   */
  normalized: string;
  /**
   * Token list derived from the normalized input.
   */
  tokens: string[];
};

/**
 * Normalize text and split into word tokens for exact/fulltext indexing.
 * @returns Normalized string and token list.
 * */
export function tokenize(
  /**
   * Raw input text to normalize and tokenize.
   */
  input: string,
): TokenizationResult {
  const normalized = input
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  const tokens = normalized.length > 0 ? normalized.split(/\s+/) : [];

  return {normalized, tokens};
}

/**
 * Normalize text and emit lossy trigrams with a prefix marker for recall-heavy search.
 * @returns Normalized string and token list.
 * */
export function tokenizeLossyTrigrams(
  /**
   * Raw input text to normalize and tokenize.
   */
  input: string,
): TokenizationResult {
  const normalized = input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  const words = normalized.length > 0 ? normalized.split(/\s+/) : [];
  const grams: string[] = [];

  for (const word of words) {
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        grams.push(word.slice(i, i + 3));
      }
    }

    const prefixLength = Math.min(word.length, 4);
    if (prefixLength > 0) {
      grams.push(`${word.slice(0, prefixLength)}*`);
    }
  }

  const tokens = Array.from(new Set(grams));
  return {normalized, tokens};
}
