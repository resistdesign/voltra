import type { Direction, Edge, EdgeKey, EdgePage, RelationalQueryOptions } from "./types";

type EdgeMetadata = Record<string, unknown>;

type RelationalBackend<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  putEdge(edge: Edge<TMetadata>): Promise<void> | void;
  removeEdge(key: EdgeKey): Promise<void> | void;
  getOutgoing(
    fromId: string,
    relation: string,
    options?: RelationalQueryOptions,
  ): Promise<EdgePage<TMetadata>> | EdgePage<TMetadata>;
  getIncoming(
    toId: string,
    relation: string,
    options?: RelationalQueryOptions,
  ): Promise<EdgePage<TMetadata>> | EdgePage<TMetadata>;
};

export type EdgePutEvent<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  action: 'edge/put';
  edge: Edge<TMetadata>;
};

export type EdgeRemoveEvent = {
  action: 'edge/remove';
  key: EdgeKey;
};

export type EdgeQueryEvent = {
  action: 'edge/query';
  direction: Direction;
  entityId: string;
  relation: string;
  limit?: number;
  cursor?: string;
};

export type RelationalHandlerEvent<TMetadata extends EdgeMetadata = EdgeMetadata> =
  | EdgePutEvent<TMetadata>
  | EdgeRemoveEvent
  | EdgeQueryEvent;

export type RelationalHandlerDependencies<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  backend: RelationalBackend<TMetadata>;
};

export type LambdaResponse = {
  statusCode: number;
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
export function setRelationalHandlerDependencies(value: RelationalHandlerDependencies): void {
  dependencies = value;
}

export async function handler(event: RelationalHandlerEvent): Promise<LambdaResponse> {
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
