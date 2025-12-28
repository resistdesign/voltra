# Voltra: FULL ORM ↔ Indexing Integration Plan (for Codex)

## Goal

Make `src/api/ORM` use `src/api/Indexing` as its **primary** engine for:

* **Search/list** (structured filters + full-text lossy/exact)
* **Relationships** (graph edges)
* **Cursor/paging** that is consistent and scalable (no table scans)

This is a serious, end-to-end integration touching:

* ORM config shape
* route-map wiring (`getTypeInfoORMRouteMap`)
* demo API (`site/api/index.ts`)
* demo IaC (`site/iac/index.ts`)
* ORM drivers + tests

## Current State (quick inventory)

### ORM today

* `TypeInfoORMService` uses:

  * `getDriver(typeName)` → `DataItemDBDriver` for CRUD + list via `listItems()` (currently DynamoDB scan-based).
  * `getRelationshipDriver(typeName, fieldName)` → `ItemRelationshipDBDriver` that stores relationship rows in a table (demo uses `__RELATIONSHIPS__`).
* `getTypeInfoORMRouteMap()` instantiates a new `TypeInfoORMService` per request and has no Indexing dependencies.
* Demo API uses `DynamoDBDataItemDBDriver` for both items and relationships.

### Indexing feature

* `src/api/Indexing` is a complete toolkit:

  * Full-text: lossy + exact/phrase
  * Structured filters: AND/OR trees, cursors
  * Relations: directional edges with cursor paging
  * DDB backends with overridable table names; defaults are fixed table names (e.g. `LossyPostings`, `RelationEdges`, etc.)

## Integration Target Architecture

### Key principle

Keep **item storage** as-is (DynamoDB tables per type), but make **search + relationships** go through Indexing.

So the ORM becomes a composition of:

1. **Storage driver** (existing `DataItemDBDriver`) for create/read/update/delete.
2. **Indexing writers/readers** to:

  * update indexes during writes
  * power list/search endpoints without scanning
3. **Indexing relational backend** for relationship CRUD and traversal

### Proposed new “ORM+Indexing” dependency bundle

Add a single config object that can be passed through route-map → service → drivers:

```ts
export type TypeInfoORMIndexingConfig = {
  // full-text
  fullText?: {
    backend: import("../Indexing").IndexBackend;
    // default indexField per type, and/or a map
    defaultIndexFieldByType?: Record<string, string>;
  };

  // structured filters
  structured?: {
    backend: import("../Indexing/structured").StructuredBackend;
    // mapping from ORM fields -> structured index fields (optional if 1:1)
    fieldMapByType?: Record<string, Record<string, string>>;
  };

  // relations
  relations?: {
    backend: import("../Indexing/rel").RelationalBackend;
    // how to encode relation names
    relationNameFor: (fromType: string, fromField: string) => string;
  };

  // optional: tracing / limits plumbing
  limits?: import("../Indexing").ResolvedSearchLimits;
};
```

Then extend the service config:

```ts
export type BaseTypeInfoORMServiceConfig = {
  typeInfoMap: TypeInfoMap;
  getDriver: (typeName: string) => DataItemDBDriver<any, any>;
  // relationship driver becomes optional/legacy (to be removed after migration)
  getRelationshipDriver?: (typeName: string, fieldName: string) => ItemRelationshipDBDriver;

  indexing?: TypeInfoORMIndexingConfig;

  createRelationshipCleanupItem?: (...args) => Promise<void>;
  customValidators?: CustomTypeInfoFieldValidatorMap;
};
```

## Phase 1 — Read + Map requirements (no code changes yet)

Codex should:

1. Read `src/api/Indexing/README.md` fully.
2. Inspect:

  * `src/api/ORM/TypeInfoORMService.ts` (relationship methods, list, listRelatedItems)
  * `src/api/ORM/drivers/*` (especially `DynamoDBDataItemDBDriver.ts` listItems implementation)
  * demo wiring (`site/api/index.ts`, `site/iac/index.ts`)
3. Write down:

  * What list/search behaviors ORM currently promises through `ListItemsConfig.criteria`.
  * What relationship behaviors ORM currently promises (`createRelationship`, `deleteRelationship`, `listRelationships`, `listRelatedItems`).

Deliverable: a short “behavior contract” doc inside PR description or a new `src/api/ORM/INDEXING_INTEGRATION.md`.

## Phase 2 — Implement Indexing-powered Relationship Driver

### Goal

Replace relationship storage from `__RELATIONSHIPS__` rows → Indexing `RelationEdges`.

### Implementation plan

1. Create a new driver file:

  * `src/api/ORM/drivers/IndexingRelationshipDriver.ts`

2. Implement an adapter that satisfies the ORM’s relationship operations using Indexing `rel` backend:

  * `createRelationship` → `relationalBackend.putEdge({ from, to, relation })`
  * `deleteRelationship` → `relationalBackend.deleteEdge(...)` (or equivalent; add if missing)
  * `listRelationships` → use `getOutgoing(fromId, relation, {cursor, limit})`

3. Decide edge encoding:

  * `fromId` should be the **fromType primary key value** encoded with type to avoid collisions.
  * Same for `toId`.
  * Recommended encoding:

    * `fromId = `${fromTypeName}#${fromTypePrimaryFieldValue}`
    * `toId   = `${toTypeName}#${toTypePrimaryFieldValue}`
    * `relation = `${fromTypeName}.${fromTypeFieldName}` (or a stable function)

4. Update `TypeInfoORMService` relationship methods to use Indexing when `config.indexing?.relations` exists:

  * `createRelationship`
  * `deleteRelationship`
  * `listRelationships`
  * `listRelatedItems`

5. Keep legacy path (existing relationship DB driver) behind a feature gate:

  * If `indexing.relations` exists → use it.
  * Else fallback to `getRelationshipDriver`.

### Tests

Add a new vitest file in `src/api/ORM/*` verifying:

* createRelationship adds an edge
* listRelationships returns expected edges + cursor
* deleteRelationship removes edge
* listRelatedItems returns actual items (requires storage driver + batch reads)

## Phase 3 — Implement Indexing-powered List/Search

### Goal

Stop using DynamoDB Scan for ORM list queries.

### Translation layer: ORM criteria → Indexing structured query

`ListItemsConfig.criteria` is an AND/OR of field criteria. Map this to Indexing structured `where` trees.

Create a translator:

* `src/api/ORM/indexing/criteriaToStructuredWhere.ts`

Rules:

* `EQUALS` → `{ type: 'term', mode: 'eq', field, value }`
* `CONTAINS` / `LIKE` (string containment) → `{ type: 'term', mode: 'contains', field, value }`
* range ops (`>`, `>=`, `<`, `<=`, BETWEEN) → `{ type: 'gt'|'gte'|'lt'|'lte'|'between', field, value }`
* Operators that Indexing structured does not support:

  * either reject with a clear error
  * OR fallback to legacy scan path (feature-flagged) until implemented

### Two-tier list execution

When `indexing.structured` exists:

1. Run `searchStructured(where)` to get docIds.
2. Fetch items by docId using storage driver `readItem`.

  * If many results: add a batch read method or parallelize with a concurrency limit.
3. Apply `selectedFields` at read time.
4. Sorting:

  * Prefer: sort by a structured range index when possible.
  * If not possible: apply in-memory sort only for small pages (warn/limit).

If `indexing.structured` is absent:

* fallback to existing `driver.listItems()`.

### Full-text integration (lossy + exact)

ORM currently has no explicit text-search API in `TypeInfoORMAPI`, but the user request says “use Indexing to its fullest”. Two options:

**Option A (minimal API change, still valuable):**

* Extend `ListItemsConfig` with an optional `text?: { query: string; mode?: 'lossy'|'exact'; indexField?: string }`.
* Route map + service list() accept it.
* If `text` present, call `searchLossy` or `searchExact`, producing docIds, then fetch items.

**Option B (explicit new endpoint):**

* Add new `TypeInfoORMAPI` method(s): `search(typeName, config, ...)` and new route paths.

Pick one; Option A is fastest and keeps the ORM surface small.

### Index maintenance on writes

To avoid stale indexes, update Indexing during:

* `create(typeName, item)`
* `update(typeName, item)`
* `delete(typeName, primaryFieldValue)`

Implementation:

* After storage write succeeds:

  * full-text: `indexDocument({ document, primaryField, indexField })`
  * structured: write fields mirror / term/range indexes (use `structuredWriter`)
* Before delete (or after read+delete):

  * remove full-text and structured entries (`removeDocument` and structured deletion equivalent; add if missing)

If structured deletion isn’t implemented yet in Indexing, implement it (required for correctness).

## Phase 4 — Refactor configs + route-map wiring

### Update `getTypeInfoORMRouteMap`

Change signature to accept indexing dependencies (or ensure `config.indexing` exists and is wired through):

```ts
export const getTypeInfoORMRouteMap = (
  config: BaseTypeInfoORMServiceConfig,
  dacConfig?: ...,
  getAccessingRole?: ...,
  authConfig?: ...,
): RouteMap => { ... }
```

No signature change is required if `BaseTypeInfoORMServiceConfig` now includes `indexing`, but the factory must be able to instantiate drivers/backends once (cold start) and reuse them.

Refactor idea (important):

* Avoid constructing a new ORM service per request if it holds reusable backends/clients.
* Create it once in `getTypeInfoORMRouteMap` closure and reuse.

## Phase 5 — Update Demo API wiring (`site/api/index.ts`)

### Replace relationship table usage

* Remove `__RELATIONSHIPS__` usage.
* Instantiate Indexing relational backend using DDB client + `RelationEdges` table.

### Add Indexing backends for full-text + structured

* Use the Indexing DDB backends:

  * Full-text backend (writer + reader)
  * Structured backend
  * Relations backend

Then pass them into `getTypeInfoORMRouteMap({ ..., indexing: { ... } })`.

## Phase 6 — Update Demo IaC (`site/iac/index.ts`)

### Add DynamoDB tables required by Indexing

Provision (at minimum):

**Full-text**

* `LossyPostings` (pk, sk)
* `ExactPostings` (pk, sk)
* `FullTextTokenStats` (pk)

Recommended to provision too (unless explicitly disabled):

* `DocTokens` (pk, sk)
* `DocTokenPositions` (pk, sk)
* `FullTextDocMirror` (pk)

**Structured**

* `StructuredTermIndex` (termKey HASH, docId RANGE)
* `StructuredRangeIndex` (field HASH, rangeKey RANGE)
* `StructuredDocFields` (docId HASH) (optional but recommended)

**Relations**

* `RelationEdges` (edgeKey HASH, otherId RANGE)

Implementation approach:

* Create a small helper in IaC or inline `.modify()` to add these tables once.
* Ensure Lambda env has table names if backends need overrides; otherwise rely on default names.

## Phase 7 — “Scan the codebase” checklist (what Codex must verify)

Codex should systematically grep / audit `src/api` to ensure:

### A) No accidental fallback to scans

* Any place calling `DynamoDBDataItemDBDriver.listItems` for non-trivial queries should be routed through structured indexing when enabled.

### B) Index maintenance is complete

* create/update/delete paths always update indexes.
* relationship create/delete always updates `RelationEdges`.

### C) Cursors are coherent

* ORM cursor returned from list/search/relationships is the Indexing cursor token, not a DynamoDB scan cursor.
* Invalid cursor errors are surfaced consistently.

### D) Configuration is explicit

* Missing indexing backends should fail loudly *only when indexing is required*.
* Demo config should wire everything.

### E) Tests cover the promises

Minimum test coverage:

* CRUD + index maintenance
* structured query equivalence for AND/OR
* exact phrase search works for quoted strings
* relationship traversal is correct (direction + relation name)

## Acceptance Criteria

* Demo API routes work with Indexing enabled.
* Demo IaC provisions all required tables.
* ORM list/search does not scan DynamoDB when indexing is configured.
* Relationship operations use `RelationEdges`.
* Tests prove correctness and protect regressions.

## Suggested PR breakdown

1. **PR 1:** Add indexing config types + route-map plumbing (no behavior change)
2. **PR 2:** Relationship migration to Indexing rel backend + tests
3. **PR 3:** Structured list/search migration + tests
4. **PR 4:** Full-text extension (Option A or B) + tests
5. **PR 5:** Demo API + IaC updates

---

## Notes / gotchas

* Indexing table names default to fixed strings. IaC must match those exact names unless you override via backend config.
* Any change to indexField behavior requires reindexing; build a dev-only endpoint/script if needed.
* If the ORM supports operators Indexing structured can’t yet represent, either:

  * implement them in Indexing, or
  * explicitly reject with clear errors (don’t silently scan).
