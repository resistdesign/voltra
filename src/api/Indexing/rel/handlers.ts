/**
 * @packageDocumentation
 *
 * Lambda-style handler for relational edge operations (put/remove/query).
 * Use {@link setRelationalHandlerDependencies} to supply a backend implementation.
 */
import type { Direction, Edge, EdgeKey, EdgePage, RelationalQueryOptions } from "./types";

type EdgeMetadata = Record<string, unknown>;

type RelationalBackend<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  /**
   * Insert or update an edge.
   * @param edge Edge to store.
   * @returns Promise resolved once stored.
   */
  putEdge(edge: Edge<TMetadata>): Promise<void> | void;
  /**
   * Remove an edge by key.
   * @param key Edge key to remove.
   * @returns Promise resolved once removed.
   */
  removeEdge(key: EdgeKey): Promise<void> | void;
  /**
   * Query outgoing edges for an entity and relation.
   * @param fromId Source entity id.
   * @param relation Relation name.
   * @param options Optional paging options.
   * @returns Page of outgoing edges.
   */
  getOutgoing(
    fromId: string,
    relation: string,
    options?: RelationalQueryOptions,
  ): Promise<EdgePage<TMetadata>> | EdgePage<TMetadata>;
  /**
   * Query incoming edges for an entity and relation.
   * @param toId Target entity id.
   * @param relation Relation name.
   * @param options Optional paging options.
   * @returns Page of incoming edges.
   */
  getIncoming(
    toId: string,
    relation: string,
    options?: RelationalQueryOptions,
  ): Promise<EdgePage<TMetadata>> | EdgePage<TMetadata>;
};

export type EdgePutEvent<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  /**
   * Action discriminator for edge inserts.
   */
  action: 'edge/put';
  /**
   * Edge payload to insert.
   */
  edge: Edge<TMetadata>;
};

export type EdgeRemoveEvent = {
  /**
   * Action discriminator for edge removals.
   */
  action: 'edge/remove';
  /**
   * Edge key to remove.
   */
  key: EdgeKey;
};

export type EdgeQueryEvent = {
  /**
   * Action discriminator for edge queries.
   */
  action: 'edge/query';
  /**
   * Direction of traversal (outgoing or incoming).
   */
  direction: Direction;
  /**
   * Entity id to query from.
   */
  entityId: string;
  /**
   * Relation name to filter by.
   */
  relation: string;
  /**
   * Optional maximum number of edges to return.
   */
  limit?: number;
  /**
   * Optional cursor string for pagination.
   */
  cursor?: string;
};

export type RelationalHandlerEvent<TMetadata extends EdgeMetadata = EdgeMetadata> =
  | EdgePutEvent<TMetadata>
  | EdgeRemoveEvent
  | EdgeQueryEvent;

export type RelationalHandlerDependencies<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  /**
   * Relational backend implementation to execute operations.
   */
  backend: RelationalBackend<TMetadata>;
};

export type LambdaResponse = {
  /**
   * HTTP status code for the response.
   */
  statusCode: number;
  /**
   * Serialized response body.
   */
  body: string;
};

let dependencies: RelationalHandlerDependencies | undefined;

/**
 * Configure the handler with a relational backend implementation.
 *
 * Example put event:
 * { "action": "edge/put", "edge": { "key": { "from": "a", "to": "b", "relation": "owns" } } }
 *
 * Example remove event:
 * { "action": "edge/remove", "key": { "from": "a", "to": "b", "relation": "owns" } }
 *
 * Example query event:
 * { "action": "edge/query", "direction": "out", "entityId": "a", "relation": "owns", "limit": 25 }
 */
export function setRelationalHandlerDependencies(
  /**
   * Backend dependencies used by the handler.
   */
  value: RelationalHandlerDependencies,
): void {
  dependencies = value;
}

/**
 * Handle relational edge events for a backend.
 * @param event Handler event describing the operation to execute.
 * @returns Lambda response with status and body payload.
 */
export async function handler(
  event: RelationalHandlerEvent,
): Promise<LambdaResponse> {
  if (!dependencies) {
    throw new Error('Relational handler dependencies are not configured. Call setRelationalHandlerDependencies().');
  }

  switch (event.action) {
    case 'edge/put':
      await dependencies.backend.putEdge(event.edge);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    case 'edge/remove':
      await dependencies.backend.removeEdge(event.key);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    case 'edge/query': {
      const options: RelationalQueryOptions = { limit: event.limit, cursor: event.cursor };
      const result =
        event.direction === 'out'
          ? await dependencies.backend.getOutgoing(event.entityId, event.relation, options)
          : await dependencies.backend.getIncoming(event.entityId, event.relation, options);

      return { statusCode: 200, body: JSON.stringify(result) };
    }
    default:
      return { statusCode: 400, body: JSON.stringify({ error: 'Unsupported action.' }) };
  }
}
