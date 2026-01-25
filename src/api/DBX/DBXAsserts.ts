import type { ListItemsResults } from "../../common/SearchTypes";

/**
 * Summary of IDs and cursors observed across pages.
 */
export type DBXPagingTranscript = {
  /**
   * Number of pages inspected.
   */
  pageCount: number;
  /**
   * Cursors observed per page.
   */
  cursors: Array<string | undefined>;
  /**
   * IDs grouped by page.
   */
  idsByPage: string[][];
  /**
   * Flattened IDs across all pages (page order preserved).
   */
  flattenedIds: string[];
};

/**
 * Results from paging invariant checks.
 */
export type DBXPagingAssertionResult = {
  /**
   * True when no invariant violations were detected.
   */
  ok: boolean;
  /**
   * Total items observed across all pages.
   */
  totalItems: number;
  /**
   * Number of unique IDs observed across all pages.
   */
  uniqueItems: number;
  /**
   * IDs that appeared more than once.
   */
  duplicateIds: string[];
  /**
   * Pages with zero items.
   */
  emptyPageIndexes: number[];
  /**
   * Pages that violated the expected page size.
   */
  pageSizeViolations: Array<{ index: number; size: number }>;
  /**
   * Raw paging transcript for debugging.
   */
  transcript: DBXPagingTranscript;
};

/**
 * Results from ordering checks against an expected sequence.
 */
export type DBXOrderingAssertionResult = {
  /**
   * True when actual ordering matches expected ordering.
   */
  ok: boolean;
  /**
   * Actual IDs in observed order.
   */
  actualIds: string[];
  /**
   * Expected IDs for comparison.
   */
  expectedIds: string[];
  /**
   * First mismatched index, if any.
   */
  mismatchIndex?: number;
};

/**
 * Build a paging transcript for a set of list results.
 */
export const getDbxPagingTranscript = <ItemType extends Record<string, any>>(
  pages: Array<ListItemsResults<ItemType>>,
  idField = "id",
): DBXPagingTranscript => {
  const idsByPage = pages.map((page) =>
    (page.items ?? [])
      .map((item) => item?.[idField])
      .filter((value): value is string => typeof value === "string"),
  );

  return {
    pageCount: pages.length,
    cursors: pages.map((page) => page.cursor),
    idsByPage,
    flattenedIds: idsByPage.flat(),
  };
};

/**
 * Assert paging invariants such as stable pagination and no duplicates.
 */
export const assertDbxPagingInvariants = <
  ItemType extends Record<string, any>,
>(
  pages: Array<ListItemsResults<ItemType>>,
  options?: {
    idField?: string;
    itemsPerPage?: number;
    allowEmptyPages?: boolean;
  },
): DBXPagingAssertionResult => {
  const idField = options?.idField ?? "id";
  const transcript = getDbxPagingTranscript(pages, idField);
  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  for (const id of transcript.flattenedIds) {
    if (seen.has(id)) {
      duplicateIds.push(id);
    } else {
      seen.add(id);
    }
  }

  const emptyPageIndexes = transcript.idsByPage
    .map((ids, index) => (ids.length === 0 ? index : -1))
    .filter((index) => index >= 0);

  const pageSizeViolations: Array<{ index: number; size: number }> = [];
  if (options?.itemsPerPage) {
    const expected = options.itemsPerPage;
    transcript.idsByPage.forEach((ids, index) => {
      if (index < transcript.idsByPage.length - 1 && ids.length !== expected) {
        pageSizeViolations.push({ index, size: ids.length });
      }
    });
  }

  const allowEmptyPages = options?.allowEmptyPages ?? false;
  const ok =
    duplicateIds.length === 0 &&
    pageSizeViolations.length === 0 &&
    (allowEmptyPages || emptyPageIndexes.length === 0);

  return {
    ok,
    totalItems: transcript.flattenedIds.length,
    uniqueItems: seen.size,
    duplicateIds,
    emptyPageIndexes,
    pageSizeViolations,
    transcript,
  };
};

/**
 * Assert that the observed ordering exactly matches an expected ordering.
 */
export const assertDbxStableOrdering = <
  ItemType extends Record<string, any>,
>(
  pages: Array<ListItemsResults<ItemType>>,
  expectedIds: string[],
  idField = "id",
): DBXOrderingAssertionResult => {
  const transcript = getDbxPagingTranscript(pages, idField);
  const actualIds = transcript.flattenedIds;
  const max = Math.max(actualIds.length, expectedIds.length);
  let mismatchIndex: number | undefined;

  for (let i = 0; i < max; i += 1) {
    if (actualIds[i] !== expectedIds[i]) {
      mismatchIndex = i;
      break;
    }
  }

  return {
    ok: mismatchIndex === undefined,
    actualIds,
    expectedIds,
    mismatchIndex,
  };
};
