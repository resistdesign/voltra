# serverless-db-index-and-query

A serverless-friendly toolkit for building multi-modal indexes (lossy and exact full-text, structured filters, and graph relations) on top of DynamoDB or in-memory backends. It exposes small building blocks and handler helpers so Lambdas or other functions can index documents, run different query modes, and page through results with lightweight cursors.

## Architecture at a Glance

The project layers three complementary index types that can be combined in application code:

- **Full-text (lossy)** — Inverted index keyed by field + tokens. Great for recall-heavy searches; uses `LossyPostings` table (`pk=f#indexField#t#token`, `sk=d#docId`). Implementation lives in `src/lossy` and shared full-text schema helpers in `src/fulltext/schema.ts`.【F:src/fulltext/schema.ts†L1-L42】
- **Full-text (exact)** — Tracks token positions to support phrase queries. Stored alongside lossy data in `ExactPostings` (`pk=f#indexField#t#token`, `sk=d#docId`, `positions`). Helpers in `src/exact` and schema in `src/fulltext/schema.ts`.【F:src/fulltext/schema.ts†L16-L33】【F:src/exact/exactDdb.ts†L1-L22】
- **Structured filters** — Term and range indexes per field for equality/contains or numeric/string comparisons. Schemas in `src/structured/structuredDdb.ts`. Query composition happens in `src/structured/searchStructured.ts` using AND/OR trees and cursor-based paging.【F:src/structured/structuredDdb.ts†L1-L78】【F:src/structured/types.ts†L1-L34】【F:src/structured/searchStructured.ts†L1-L90】
- **Relational edges** — Simple graph edges (outgoing/incoming) stored twice for each relation to support directional traversals. Schema and cursor encoding live in `src/rel/relationalDdb.ts`.【F:src/rel/relationalDdb.ts†L1-L108】

Serverless handlers (`src/handler.ts`) wrap these primitives. Use `setHandlerDependencies` to inject a concrete backend (DynamoDB, in-memory for tests), then dispatch index/search events by `action`.【F:src/handler.ts†L1-L78】

## DynamoDB Schemas

### Full-text tables
- **LossyPostings** (`pk`, `sk`): `pk=f#<indexField>#t#<token>`, `sk=d#<docId>`
- **ExactPostings** (`pk`, `sk`, `positions`): `pk=f#<indexField>#t#<token>`, `sk=d#<docId>`, `positions` array
- **FullTextDocMirror** (`pk`, `content`): optional mirror of full docs keyed by `pk=d#<docId>#f#<indexField>`
- **FullTextTokenStats** (`pk`, `df`): token document frequency by `pk=f#<indexField>#t#<token>`
- **DocTokens** (`pk`, `sk`): optional doc→token mapping `pk=d#<docId>`, `sk=f#<indexField>#t#<token>`
- **DocTokenPositions** (`pk`, `sk`, `positions`): optional doc→token positions `pk=d#<docId>`, `sk=f#<indexField>#t#<token>`

### Structured tables
- **StructuredTermIndex** (`termKey`, `docId`, `field`, `value`, `mode`): `termKey=<field>#<mode>#<serializedValue>` supports `eq` and `contains` lookups.【F:src/structured/structuredDdb.ts†L1-L53】
- **StructuredRangeIndex** (`field`, `rangeKey`, `value`, `docId`): `rangeKey=<serializedValue>#<docId padded>` for ordered range scans.【F:src/structured/structuredDdb.ts†L55-L76】
- **StructuredDocFields** (`docId`, `fields`): optional per-document field mirror.【F:src/structured/structuredDdb.ts†L78-L82】

### Relational table
- **RelationEdges** (`edgeKey`, `otherId`, `metadata`): `edgeKey=<entityId>\u0000<relation>\u0000<direction>` where direction is `in` or `out`; every edge is stored twice (forward/backward).【F:src/rel/relationalDdb.ts†L1-L62】

## Configuration and Limits

Search operations enforce soft guards via `SearchLimits` (tokens processed, postings pages, verified candidates, and time budget). Defaults and hard caps live in `src/handler/config.ts`:

- Defaults: `maxTokens` 6; `maxPostingsPages` 4; `maxCandidatesVerified` 200; `softTimeBudgetMs` 150.
- Caps: `maxTokens` 12; `maxPostingsPages` 12; `maxCandidatesVerified` 1_000; `softTimeBudgetMs` 500.

Override per request by passing a `limits` object to search calls or handler events; the handler resolver merges overrides with defaults and clamps to the caps to prevent runaway workloads.【F:src/handler/config.ts†L1-L51】【F:src/handler.ts†L16-L116】

No mandatory environment variables are required by the library itself; configure your DynamoDB client and table names in the backend wiring for your runtime.

## Indexing Fields and IDs

- `primaryField` identifies the document ID and is stringified (`String(value)`); missing or empty values throw.
- `indexField` scopes tokens and postings, so searches must pass the same field used at index time.
- Changing index-field behavior or upgrading from the legacy schema requires re-indexing; old entries are not migrated automatically.

## Setup

1. Install dependencies: `yarn install --immutable`
2. Build TypeScript: `yarn build`
3. Run tests: `yarn test`

## Demo UI (isolated Astro site)

An Astro + React demo lives in `demo/` and is not part of the library build. Use the helper scripts to explore it locally:

```bash
yarn demo:install
yarn --cwd demo astro dev
```

You can also build or preview the static output without touching the package artifacts:

```bash
yarn --cwd demo astro build
yarn --cwd demo astro preview
```

Vitest runs the unit suite covering tokenization, full-text modes, structured filters, and handler dispatch.

## Serverless Handler Examples

Configure the handler once at cold start:

```ts
import { handler, setHandlerDependencies } from './src/handler.js';
import { createDynamoBackend } from './your-backend-factory';

setHandlerDependencies({ backend: createDynamoBackend() });
```

Example payloads (invoke via Lambda, Functions, or tests):

- Index a document
  ```json
  { "action": "indexDocument", "document": { "id": "doc-1", "title": "Hello world", "fields": { "category": "news" } }, "primaryField": "id", "indexField": "title" }
  ```
- Remove a document
  ```json
  { "action": "removeDocument", "document": { "id": "doc-1", "title": "Hello world" }, "primaryField": "id", "indexField": "title" }
  ```
- Lossy full-text search (recall-oriented)
  ```json
  { "action": "searchLossy", "query": "hello world", "indexField": "title", "limit": 10 }
  ```
- Exact/phrase search (position aware)
  ```json
  { "action": "searchExact", "query": "\"hello world\"", "indexField": "title", "limit": 10 }
  ```

The handler logs a compact trace with elapsed time and resolved limits for observability.【F:src/handler.ts†L80-L123】

## Indexing and Query Recipes

### Indexing
Use `indexDocument` to tokenize text and populate lossy/exact postings. Documents can use string IDs (numeric IDs are stringified), and callers choose which field to index via `indexField`.

```ts
await indexDocument({
  document: { id: 'doc-42', body: 'Quick brown fox' },
  primaryField: 'id',
  indexField: 'body',
  backend,
});
```

### Lossy full-text search
Recall-focused matching that treats any token match as a candidate. Supports pagination via cursors.

```ts
const result = await searchLossy({ query: 'quick fox', indexField: 'body', limit: 5, backend });
// result.docIds => [42, ...]; result.nextCursor for subsequent pages
```

### Exact full-text search
Position-aware matching for phrases. Pass quoted phrases in the query; candidates are verified using stored token positions.

```ts
const result = await searchExact({ query: '"quick brown"', indexField: 'body', limit: 5, backend });
```

### Structured queries
Compose boolean trees with term and range clauses. Example: find docs in category "news" with a score >= 0.8 or tagged with "breaking".

```ts
const where = {
  or: [
    { and: [
      { type: 'term', field: 'category', mode: 'eq', value: 'news' },
      { type: 'gte', field: 'score', value: 0.8 },
    ]},
    { type: 'term', field: 'tags', mode: 'contains', value: 'breaking' },
  ],
};
const page = await searchStructured({ where, backendStructured, options: { limit: 20 } });
```

### Relation queries
Edges are stored in both directions. Fetch outgoing or incoming edges with cursors for pagination.

```ts
// Add an edge
await relationalBackend.putEdge({ key: { from: 'user#1', to: 'post#9', relation: 'LIKES' }, metadata: { at: Date.now() } });

// Page outgoing edges
const outgoing = await relationalBackend.getOutgoing('user#1', 'LIKES', { limit: 25, cursor });
// outgoing.edges => [{ key: { from, to, relation }, metadata }]; outgoing.nextCursor for the next page
```

## Troubleshooting

- **Missing backend configuration**: Calls without `setIndexBackend`/`setHandlerDependencies` throw an error to prevent accidental no-op usage.【F:src/api.ts†L25-L44】【F:src/handler.ts†L40-L56】
- **Throttling/large scans**: Tune `limits` on search requests to reduce token processing or postings pages per query.【F:src/api.ts†L69-L118】
- **Unexpected empty results**: For exact searches ensure documents were indexed with position data (ExactPostings, DocTokenPositions if used). For structured queries, verify field values are serialized consistently (see `serializeStructuredValue`).【F:src/structured/structuredDdb.ts†L84-L115】
- **Cursor errors**: Cursors are JSON-encoded; tampered or invalid tokens throw `Invalid ... cursor token` errors in cursor decoders (structured and relational). Re-run the query without the cursor to reset paging.【F:src/structured/searchStructured.ts†L1-L63】【F:src/rel/relationalDdb.ts†L85-L108】

With these building blocks and examples, you can provision the DynamoDB tables, wire in your client, and run index/search flows confidently in serverless environments.
