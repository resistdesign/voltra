# Indexing Refactor Plan (Table Names + Demo Sync + AWS DDB Reuse)

## Progress

- [x] Phase 1: Removed indexing table names from library schemas (fulltext/structured/relations).
- [x] Phase 2: Require table-name injection for fulltext + structured DDB configs; added `*TableNames` types.
- [x] Phase 3: Added shared AWS SDK v3 adapter + retry helper; structured indexing now uses the shared client interface.
- [x] Phase 3: Demo API indexing backends now use library adapters and no longer carry AWS conversion glue.
- [x] Phase 6: Updated relational indexing spec to match schema shape changes.
- [~] Demo API table names still hardcoded in `site/api` (to be replaced by IaC-driven constants later).

* Goals

  * Eliminate *all* hardcoded indexing table names from `src/api/Indexing/**` (fulltext/structured/rel) and force table-name injection through the type system
  * Make the Demo Site (`site/api`) read its indexing table names from the Demo IaC (`site/iac`) via shared constants + env var wiring (no duplicated literals)
  * Pull Demo’s DynamoDB indexing implementation into reusable library code under `src/api/Indexing/**` (AWS SDK v3 + util-dynamodb), so `site/api/*Backend.ts` becomes thin
  * Keep Voltra’s broader philosophy intact: TS single-source-of-truth + reusable packages + minimal app glue

* Inventory (current state)

  * Library hardcoded indexing table names (must go)

    * Fulltext: `src/api/Indexing/fulltext/schema.ts` (`LossyPostings`, `ExactPostings`, `FullTextDocMirror`, `FullTextTokenStats`, `DocTokens`, `DocTokenPositions`)
    * Relations: `src/api/Indexing/rel/relationalDdb.ts` (`RelationEdges`)
    * Structured: `src/api/Indexing/structured/structuredDdb.ts` (term/range/docFields tables)
  * Library backends that *default* to schema.tableName (must go)

    * Fulltext writer/reader/backend (e.g. `FullTextDdbWriter` uses `config.* ?? schema.tableName`)
    * Structured backend (`StructuredDdbReader` etc. uses `config.* ?? schema.tableName`)
  * Demo IaC hardcodes indexing tables (must go)

    * `site/iac/index.ts` directly creates indexing DynamoDB tables by string literals
  * Demo API doesn’t configure indexing table names (must change)

    * `site/api/fullTextBackend.ts`, `site/api/structuredBackend.ts`, `site/api/relationalBackend.ts` currently rely on library defaults
  * Demo API contains repeated AWS SDK conversion glue (must consolidate)

    * `site/api/awsConversions.ts` + repeated BatchWrite/BatchGet marshalling logic

* Architecture target (new shapes)

  * Indexing tables have *two* “name categories”

    * DynamoDB table *names* (deployment-specific, must be injected)
    * DynamoDB item *schema* (attribute names + key encoders, stable, stays in library)
  * “Schema constants” must never include `tableName`

    * Keep `partitionKey`, `sortKey`, attribute names, and key-encoding functions in `schema.ts`/`structuredDdb.ts`/`relationalDdb.ts`
    * Remove `tableName` from those exported schema objects entirely
  * Backends must require a `tables` object whose keys are enforced by TS

    * Fulltext required tables: lossyPostings, exactPostings, docMirror, tokenStats, docTokens, docTokenPositions
    * Structured required tables: termIndex, rangeIndex, docFields
    * Relations required tables: relationEdges
    * (Optional) allow feature-based narrowing later, but *default* must be “explicit is required”
  * Provide a first-class AWS SDK v3 adapter in the library

    * `src/api/Indexing/ddb/awsSdkV3Client.ts` (or similar) exports helpers to build the minimal client interfaces used by indexing backends
    * Library code owns marshalling/unmarshalling + chunking + retry loops consistently
    * Demo code should only supply `DynamoDBClient` (and optionally overrides like retry/backoff limits)

* Phase 1: Remove hardcoded tableName from library schemas

  * Fulltext

    * Edit `src/api/Indexing/fulltext/schema.ts`

      * Delete `tableName` fields from all `*Schema` objects
      * Ensure all code that referenced `*.tableName` is migrated to injected config
  * Relations

    * Edit `src/api/Indexing/rel/relationalDdb.ts`

      * Remove `tableName` from `relationEdgesSchema`
  * Structured

    * Edit `src/api/Indexing/structured/structuredDdb.ts`

      * Remove `tableName` fields from `structuredTermIndexSchema`, `structuredRangeIndexSchema`, `structuredDocFieldsSchema`

* Phase 2: Force table-name injection through types (library public API change)

  * Fulltext DDB backend

    * Introduce a required `FullTextTableNames` type

      * `type FullTextTableNames = { lossyPostings: string; exactPostings: string; docMirror: string; tokenStats: string; docTokens: string; docTokenPositions: string }`
    * Update all Fulltext DDB configs to require `tables: FullTextTableNames`

      * `FullTextDdbWriterConfig` becomes `{ client: ...; tables: FullTextTableNames }` (no optional table fields)
      * Apply across writer/reader/backend, and remove `?? schema.tableName` fallbacks
    * Prefer *one* canonical injection point

      * If `FullTextDdbBackend` composes reader+writer, make `FullTextDdbBackendConfig` accept `tables` once and pass through
    * Update internal helpers to use `tables.*` consistently
  * Structured DDB backend

    * Standardize the backend config shape to match Fulltext (even if implementation differs)

      * `type StructuredTableNames = { termIndex: string; rangeIndex: string; docFields: string }`
      * `StructuredDdbBackendConfig` becomes `{ client: DynamoDBClient; tables: StructuredTableNames }` (no optionals)
    * Remove `config.termTableName ?? ...` patterns everywhere
  * Relations DDB backend

    * Introduce `type RelationsTableNames = { relationEdges: string }`
    * Update `RelationalDdbBackend` config to require `tables: RelationsTableNames`
    * Remove `relationEdgesSchema.tableName` usage entirely
  * Breakage expectations (explicitly handle)

    * This is a library-level breaking change (constructor signatures and config shapes)
    * Update all imports/exports + public types in `src/api/Indexing/index.ts` barrel
    * Update docs (TypeDoc output) to reflect new required configs

* Phase 3: Unify DynamoDB execution + conversions inside the library

  * Decide on a single internal “Dynamo operations surface”

    * Option A (recommended for consistency): all DDB backends use `DynamoDBClient` + `@aws-sdk/util-dynamodb` internally (like current structured backend)

      * Pro: simplest consumer code (pass AWS client), no bespoke conversion layer
      * Con: library becomes AWS-SDK-coupled (already true via dependencies)
    * Option B: all DDB backends accept a minimal client interface (like fulltext) and provide an AWS-SDK adapter helper

      * Pro: testability + portability to other DDB clients
      * Con: extra wrapper layer everywhere
  * Codex guidance: pick *one* option and apply it to fulltext + relations + structured (no mixed styles)

    * If choosing Option A

      * Refactor `src/api/Indexing/fulltext/ddbBackend.ts` to use AWS SDK commands directly and delete `site/api/awsConversions.ts` usage for indexing
      * Refactor relations backend builder similarly (move retry/chunk logic to library)
    * If choosing Option B

      * Refactor structured backend to use the same minimal client interface as fulltext (remove direct `send(new QueryCommand(...))` from indexing core)
      * Add `src/api/Indexing/ddb/awsSdkV3Adapter.ts` that implements the minimal interface once using `marshall/unmarshall`
  * Required outcomes regardless of option

    * `site/api/fullTextBackend.ts`, `site/api/relationalBackend.ts`, `site/api/structuredBackend.ts` become thin wrappers (or disappear entirely)
    * Remove duplicated retry/chunking logic from `site/api` (one implementation in library)
    * Prefer a reusable `batchWriteWithRetry` utility in library with sane defaults + hook points

* Phase 4: Demo IaC becomes the source of truth for table names

  * Create Demo table-name constants in `site/common`

    * New file: `site/common/IndexingTableNames.ts`

      * Export one object with all indexing table names as string literals
      * Example keys mirror the library `*TableNames` types (lossyPostings/exactPostings/...) for 1:1 wiring
    * Ensure no other file contains these literals anymore (grep-driven enforcement)
  * Update `site/iac/index.ts`

    * Replace the `addIndexingTable("LossyPostings", ...)` literals with constants
    * Add Lambda env vars for indexing tables

      * Example: `INDEXING_FULLTEXT_LOSSY_POSTINGS_TABLE`, etc. (final naming up to Codex, but must be systematic)
      * Keep the env-var naming centralized in the same constants module to avoid drift
    * Add any needed DDB permissions if the Lambda policy is table-name-specific
  * Update `site/api/index.ts` / lambda bootstrap

    * Read indexing table env vars at startup and fail fast if missing
    * Create indexing backends with `tables: { ... }` objects from env
    * Ensure demo types’ persisted tables continue to be wired as before (`TABLE_${TYPE}`)

* Phase 5: Demo API uses IaC-driven config + reusable library backend builders

  * Delete or shrink these files by pushing logic into the library

    * `site/api/relationalBackend.ts`
    * `site/api/fullTextBackend.ts`
    * `site/api/awsConversions.ts`
    * `site/api/structuredBackend.ts`
  * Preferred new shape

    * `site/api/indexing.ts` (single place)

      * `const indexingTables = readIndexingTablesFromEnv(process.env)`
      * `export const fullTextBackend = createFullTextDdbBackend({ ddbClient, tables: indexingTables.fullText })`
      * `export const structured = createStructuredDdbBackend({ ddbClient, tables: indexingTables.structured })`
      * `export const relations = createRelationsDdbBackend({ ddbClient, tables: indexingTables.relations })`
    * `site/api/routeMap.ts` references those exports (no table names present)

* Phase 6: Tests + fixtures update (must be done alongside refactor)

  * Update indexing spec tests under `src/api/Indexing/**.spec.json`

    * Relational: `src/api/Indexing/rel/relationalIndexing.spec.json` currently includes `tableName` in expected config payloads (remove/replace)
    * Any fulltext/structured tests that assume default table names must now provide explicit `tables` config in the test harness
  * Add a focused unit-test for “missing table names fails fast”

    * Ensure constructors throw a clear error when any required table name is empty/undefined
  * Add a cross-check test for Demo env var mapping (optional but high-value)

    * Given the demo constants, generate env-var names and ensure they match the IaC env var keys

* Phase 7: Docs + public surface cleanup

  * Update TypeDoc comments for new config types

    * “table names are required and deployment-specific” as first-class documentation
  * Update any README/docs that mention indexing setup

    * Ensure demo instructions mention env vars and IaC constants, not “defaults”
  * Update barrel exports

    * Export new `*TableNames` types
    * Export new AWS builder helpers (if introduced) under a stable path

* Migration / compatibility strategy (Codex must choose one)

  * Strategy A (clean break)

    * Release as breaking change (major or alpha bump), remove defaults immediately
  * Strategy B (one-release deprecation window)

    * Keep old constructors deprecated but still functional by requiring explicit `tables` soon after
    * In deprecation window, defaults remain but emit runtime warnings (only if you already have a logging story)
    * After window, remove fallbacks and delete schema tableName permanently

* Definition of done

  * `src/api/Indexing/**` contains zero table name string literals for indexing tables (only attribute names remain)
  * All DDB indexing backends require table names via typed config and have no fallback defaults
  * Demo IaC defines table names through shared constants only, and also exports env-var keys systematically
  * Demo API reads table names from env and passes them into indexing backends (no drift possible)
  * All tests passing (`yarn test`) and demo builds still succeed (`yarn site:build:iac`, `yarn site:build:api`)
  * No duplicate AWS conversion logic remains in `site/api` for indexing (moved into library)
