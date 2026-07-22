# Voltra Indexing

A serverless-friendly toolkit for building multi-modal indexes—lossy and exact full-text, structured filters, and graph relations—on top of one DynamoDB table or the matching in-memory backends.

## Architecture at a Glance

The project layers three complementary index types that can be combined in application code:

- **Full-text (lossy)** — Inverted index keyed by field + tokens for recall-heavy searches.
- **Full-text (exact)** — Token positions for phrase queries and exact verification.
- **Structured filters** — Term and range indexes per field for equality/contains or numeric/string comparisons. Schemas and query composition live in `src/api/Indexing/structured`.
- **Relational edges** — Simple graph edges (outgoing/incoming) stored twice for each relation to support directional traversals. Schema and cursor encoding live in `src/api/Indexing/rel`.

Serverless handlers (`src/api/Indexing/Handler.ts`) wrap these primitives. Use `setHandlerDependencies` to inject a concrete backend (DynamoDB or in-memory for tests), then dispatch index/search events by `action`.

## One DynamoDB Table

Provision one table with string partition and sort keys:

```ts
const table = {
  attributes: { pk: "S", sk: "S" },
  keys: { pk: "HASH", sk: "RANGE" },
};
```

Every logical index is an explicitly namespaced candidate stream. The `kind` attribute helps diagnostics and migration tooling; application fields remain nested in Voltra-owned attributes and can never collide with `pk`, `sk`, or `kind`.

| Record family       | `pk` stream                                 | `sk` member order                  |
| ------------------- | ------------------------------------------- | ---------------------------------- |
| Structured term     | `v1#st#<field>#<mode>#<value>`              | `d#<type>#<docId>`                 |
| Structured range    | `v1#sr#<field>`                             | `<sortableValue>#d#<type>#<docId>` |
| Structured document | `v1#sd#d#<type>#<docId>`                    | `state`                            |
| Lossy posting       | `v1#fl#<field>#<token>`                     | `d#<type>#<docId>`                 |
| Exact posting       | `v1#fe#<field>#<token>`                     | `d#<type>#<docId>`                 |
| Document mirror     | `v1#fm#d#<type>#<docId>`                    | `f#<field>`                        |
| Token statistics    | `v1#fs#<field>#<token>`                     | `state`                            |
| Document token      | `v1#ft#d#<type>#<docId>`                    | `f#<field>#t#<token>`              |
| Token positions     | `v1#fp#d#<type>#<docId>`                    | `f#<field>#t#<token>`              |
| Relationship edge   | `v1#re#e#s#<entity>#<relation>#<direction>` | `e#s#<otherId>`                    |

All physical keys must be created through the exported key utilities. Identity segments use URI-component encoding for delimiter safety. Document identities additionally carry `n`/`s` type tags, so numeric `123` and string `"123"` cannot collide and retain their type through cursors. Sortable values do not use URI encoding: finite numbers use an order-preserving IEEE-754 transform and other range-capable values use UTF-8 hex so DynamoDB byte order matches the comparison contract.

```ts
const table = { tableName: process.env.INDEXING_TABLE as string };

const fullText = new FullTextDdbBackend({ client, table });
const structured = new StructuredDdbBackend({ client, table });
const relationships = new RelationalDdbBackend(
  createRelationEdgesDdbDependencies({ client, table }),
);
```

## Configuration and Limits

Search operations enforce soft guards via `SearchLimits` (tokens processed, postings pages, verified candidates, and time budget). Defaults and hard caps live in `src/api/Indexing/Handler/Config.ts`:

- Defaults: `maxTokens` 6; `maxPostingsPages` 4; `maxCandidatesVerified` 200; `softTimeBudgetMs` 150.
- Caps: `maxTokens` 12; `maxPostingsPages` 12; `maxCandidatesVerified` 1_000; `softTimeBudgetMs` 500.

Override per request by passing a `limits` object to search calls or handler events; the handler resolver merges overrides with defaults and clamps to the caps to prevent runaway workloads.

No environment variable name is imposed by the library. The demo uses one `INDEXING_TABLE` variable through `site/common/IndexingTable.ts` and passes the resulting `IndexTableConfig` to every backend.

## Indexing Fields and IDs

- `primaryField` identifies the document ID. Non-empty strings and finite numbers retain their scalar type; other values throw.
- `indexField` scopes tokens and postings. ORM integrations use `qualifyIndexField(typeName, fieldName)`; consumers should not concatenate type and field names themselves.
- Changing index-field behavior or upgrading from the legacy schema requires re-indexing; old entries are not migrated automatically.

## Setup

1. Install dependencies: `yarn install`
2. Build TypeScript: `yarn build`
3. Run tests: `yarn test`

## Demo UI

The Astro + React demo lives in `site/app`. Build the API and static application with:

```bash
yarn site:build:api
yarn site:build:app
```

## Serverless Handler Examples

Configure the handler once at cold start:

```ts
import { handler, setHandlerDependencies } from "@resistdesign/voltra/api";
import { createDynamoBackend } from "./your-backend-factory";

setHandlerDependencies({ backend: createDynamoBackend() });
```

Example payloads (invoke via Lambda, Functions, or tests):

- Index a document
  ```json
  {
    "action": "indexDocument",
    "document": {
      "id": "doc-1",
      "title": "Hello world",
      "fields": { "category": "news" }
    },
    "primaryField": "id",
    "indexField": "title"
  }
  ```
- Remove a document
  ```json
  {
    "action": "removeDocument",
    "document": { "id": "doc-1", "title": "Hello world" },
    "primaryField": "id",
    "indexField": "title"
  }
  ```
- Lossy full-text search (recall-oriented)
  ```json
  {
    "action": "searchLossy",
    "query": "hello world",
    "indexField": "title",
    "limit": 10
  }
  ```
- Exact/phrase search (position aware)
  ```json
  {
    "action": "searchExact",
    "query": "\"hello world\"",
    "indexField": "title",
    "limit": 10
  }
  ```

The handler logs a compact trace with elapsed time and resolved limits for observability.

## Indexing and Query Recipes

### Indexing

Use `indexDocument` to tokenize text and populate lossy/exact postings. Documents can use string or finite numeric IDs, and callers choose which field to index via `indexField`.

```ts
await indexDocument({
  document: { id: "doc-42", body: "Quick brown fox" },
  primaryField: "id",
  indexField: "body",
  backend,
});
```

### Lossy full-text search

Recall-focused matching that treats any token match as a candidate. Supports pagination via cursors.

```ts
const result = await searchLossy({
  query: "quick fox",
  indexField: "body",
  limit: 5,
  backend,
});
// result.docIds => [42, ...]; result.nextCursor for subsequent pages
```

### Exact full-text search

Position-aware matching for phrases. Pass quoted phrases in the query; candidates are verified using stored token positions.

```ts
const result = await searchExact({
  query: '"quick brown"',
  indexField: "body",
  limit: 5,
  backend,
});
```

### Structured queries

Compose boolean trees with term and range clauses. Example: find docs in category "news" with a score >= 0.8 or tagged with "breaking".

```ts
const where = {
  or: [
    {
      and: [
        { type: "term", field: "category", mode: "eq", value: "news" },
        { type: "gte", field: "score", value: 0.8 },
      ],
    },
    { type: "term", field: "tags", mode: "contains", value: "breaking" },
  ],
};
const page = await searchStructured({
  where,
  backendStructured,
  options: { limit: 20 },
});
```

### Relation queries

Edges are stored in both directions. Fetch outgoing or incoming edges with cursors for pagination.

```ts
// Add an edge
await relationalBackend.putEdge({
  key: { from: "user#1", to: "post#9", relation: "LIKES" },
  metadata: { at: Date.now() },
});

// Page outgoing edges
const outgoing = await relationalBackend.getOutgoing("user#1", "LIKES", {
  limit: 25,
  cursor,
});
// outgoing.edges => [{ key: { from, to, relation }, metadata }]; outgoing.nextCursor for the next page
```

## Global Range Criteria with Unrelated Sorting

For `age BETWEEN 23 AND 34` sorted by `name`, the exact baseline traverses the already ordered `name` range stream, verifies each candidate's canonical structured fields, stops when the page is full, and resumes from that stream cursor. Sparse compliance can still require many reads; that is a cost distribution problem, not a correctness problem.

The required next indexing subsystem is a data-skipping layer:

```text
criterion value chunks -> ordered sort-index blocks -> exact candidate IDs
```

Block summaries may produce false positives but never false negatives. The remaining block/chunk configuration, concurrency, generation, query-composition, cursor, and backfill decisions are tracked in `planning/feat-link-and-lock-chunk-skipping.md`. Collision-safe typed identities and immediate cleanup of obsolete real term/range/full-text rows are already implemented and tested in both Dynamo-shaped and in-memory paths.

## Troubleshooting

- **Missing backend configuration**: Calls without `setIndexBackend` or `setHandlerDependencies` throw instead of silently skipping indexing.
- **Throttling/large scans**: Tune request `limits` to reduce token processing, postings pages, or verified candidates.
- **Unexpected empty results**: Ensure exact searches were indexed with position data. For structured queries, ensure the indexed field and query bounds use the same TypeInfo-driven comparison type.
- **Cursor errors**: Cursors are opaque continuation state. Do not edit them or reuse them with a different query; restart without a cursor after a query-shape change.

With these building blocks and examples, you can provision the DynamoDB table, wire in your client, and run index/search flows confidently in serverless environments.
