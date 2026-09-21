/**
 * Runtime counters and metadata collected during a search.
 * */
export type SearchTrace = {
  /**
   * Epoch timestamp when the search started.
   */
  startTimeMs: number;
  /**
   * Total number of tokens processed for the query.
   */
  tokenCount?: number;
  /**
   * Hash of the normalized query text for correlation.
   */
  queryHash?: string;
  /**
   * Hash of the primary token chosen for paging.
   */
  primaryTokenHash?: string;
  /**
   * Number of postings pages read.
   */
  postingsPages: number;
  /**
   * Number of candidates verified for exact matching.
   */
  candidatesVerified: number;
  /**
   * Number of batch get calls for token checks.
   */
  batchGetCalls: number;
  /**
   * Total number of keys checked via batch get calls.
   */
  batchGetKeys: number;
  /**
   * Storage query calls issued by the active index driver.
   */
  storageQueryCalls: number;
  /**
   * Storage batch-read calls issued by the active index driver.
   */
  storageBatchReadCalls: number;
  /**
   * Storage item-read calls issued by the active index driver.
   */
  storageItemReadCalls: number;
};

/**
 * Initialize a search trace with counters set to zero.
 * @returns New search trace instance.
 * */
export function createSearchTrace(): SearchTrace {
  return {
    startTimeMs: Date.now(),
    postingsPages: 0,
    candidatesVerified: 0,
    batchGetCalls: 0,
    batchGetKeys: 0,
    storageQueryCalls: 0,
    storageBatchReadCalls: 0,
    storageItemReadCalls: 0,
  };
}
