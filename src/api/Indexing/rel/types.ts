/**
 * @packageDocumentation
 *
 * Shared types for relational indexing and handler interfaces.
 */
/**
 * Edge traversal direction.
 */
export type Direction = "out" | "in";

export type EdgeKey = {
  /**
   * Source entity id.
   */
  from: string;
  /**
   * Target entity id.
   */
  to: string;
  /**
   * Relation name.
   */
  relation: string;
  /**
   * Optional direction override for the edge.
   */
  direction?: Direction;
};

export type Edge<TMetadata = Record<string, unknown>> = {
  /**
   * Edge key describing the relation.
   */
  key: EdgeKey;
  /**
   * Optional metadata stored with the edge.
   */
  metadata?: TMetadata;
};

export type EdgePage<TMetadata = Record<string, unknown>> = {
  /**
   * Returned edges for the page.
   */
  edges: Array<Edge<TMetadata>>;
  /**
   * Cursor string for the next page, if more results exist.
   */
  nextCursor?: string;
};

export type RelationalQueryOptions = {
  /**
   * Optional maximum number of edges to return.
   */
  limit?: number;
  /**
   * Optional cursor string for pagination.
   */
  cursor?: string;
};
