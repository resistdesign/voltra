export type Direction = 'out' | 'in';

export type EdgeKey = {
  from: string;
  to: string;
  relation: string;
  direction?: Direction;
};

export type Edge<TMetadata = Record<string, unknown>> = {
  key: EdgeKey;
  metadata?: TMetadata;
};

export type EdgePage<TMetadata = Record<string, unknown>> = {
  edges: Array<Edge<TMetadata>>;
  nextCursor?: string;
};

export type RelationalQueryOptions = {
  limit?: number;
  cursor?: string;
};
