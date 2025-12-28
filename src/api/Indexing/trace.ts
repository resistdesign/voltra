export type SearchTrace = {
  startTimeMs: number;
  tokenCount?: number;
  queryHash?: string;
  primaryTokenHash?: string;
  postingsPages: number;
  candidatesVerified: number;
  batchGetCalls: number;
  batchGetKeys: number;
  ddbQueryCalls: number;
  ddbBatchGetCalls: number;
  ddbItemReadCalls: number;
};

export function createSearchTrace(): SearchTrace {
  return {
    startTimeMs: Date.now(),
    postingsPages: 0,
    candidatesVerified: 0,
    batchGetCalls: 0,
    batchGetKeys: 0,
    ddbQueryCalls: 0,
    ddbBatchGetCalls: 0,
    ddbItemReadCalls: 0,
  };
}
