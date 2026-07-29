/** Shared Unicode normalization for semantic case-insensitive text matching. */
export const normalizeIndexText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("und")
    .replace(/[\s\p{P}\p{S}]+/gu, " ")
    .trim();
