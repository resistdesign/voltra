# ORM Health Monitoring

## Goal

Add an optional, infrastructure-neutral Voltra health subsystem that can observe ORM performance, persist operational health state through one normal ORM-style data driver, audit index integrity, perform strongly validated bounded repairs, and resume scheduled work safely.

## Critical Architecture Correction

The Health work exposed a pre-existing architectural deviation in Indexing: storage-specific implementations and types currently live inside generic `src/api/Indexing/**`. This violates Voltra's core objective that ORM/indexing behavior is normalized across all current and future drivers.

The correction must preserve functionality. Generic Indexing continues to own all semantics and strategies; drivers only implement the generic storage operations required to persist/query those structures.

### Storage-driver isolation checklist

- [x] Record storage-driver isolation as a repository-wide core objective in `AGENTS.md`.
- [~] Inventory every storage-specific implementation/type currently outside `drivers/` and classify the generic behavior that must remain in Indexing.
- [ ] Define the minimal generic index-storage contracts required by Voltra's existing exact/range/membership/full-text/relationship/occupancy/maintenance behavior.
- [ ] Refactor generic indexing algorithms to depend only on those contracts, with no DynamoDB/S3/in-memory concepts in generic modules.
- [ ] Move DynamoDB-specific indexing clients, adapters, persistence implementations, schemas/configuration, and tests into the Dynamo driver folder.
- [ ] Move S3-specific indexing persistence implementations/tests into the S3 driver folder.
- [ ] Move in-memory-specific indexing persistence implementations/tests into the in-memory driver folder while preserving identical generic indexing behavior.
- [ ] Remove backend-specific exports/imports from generic Indexing barrels/docs and expose driver implementations through driver barrels instead.
- [ ] Add architecture regression checks proving generic Indexing contains no backend-specific imports/names and no driver-specific implementation files.
- [ ] Add cross-driver contract tests proving the same generic indexing strategies execute against multiple driver implementations.
- [ ] Re-run the complete test/build/demo/export/consumer workflow and update PR #405 only after the architecture is clean and behavior is preserved.

## Checklist

- [x] Add the public `@resistdesign/voltra/health` barrel and package/build/docs/export wiring.
- [x] Define one extensible driver-backed Health record model for telemetry, findings, repair history, runs, checkpoints, and queued work.
- [x] Add lightweight optional ORM operation timing/diagnostic observation without allowing health recording failures to change ORM behavior.
- [x] Add bounded ORM/index inspection primitives needed by health monitoring, including structured/full-text mirror inspection, canonical-side verification, strong canonical reads where supported, and guarded item-level index repair.
- [x] Implement a resumable `TypeInfoORMHealthMonitor` that:
  - [x] records and compacts slow-query and operation statistics without persisting criteria values;
  - [x] audits orphaned index state and canonical items with missing/mismatched current indexes in bounded pages;
  - [x] detects index-relevant TypeInfo schema drift, including added/changed/removed indexed types and fields, and performs bounded reconciliation;
  - [x] requires repeated/strong validation before destructive orphan cleanup;
  - [x] strongly revalidates missing-index findings before automatic reindex repair and verifies the result afterward;
  - [x] reindexes canonical survivors when repair is needed;
  - [x] persists progress/checkpoints, compact statistics, findings, and repair history in the Health store;
  - [x] prunes expired Health records without requiring storage-specific TTL support.
- [x] Add focused specs for observation, persistence/progress, orphan detection, missing-index detection, destructive-validation safety, race guards, schema drift, repair idempotency, status paging, and bounded continuation.
- [x] Update consumer/export checks and public documentation/examples for the new barrel and public types.
- [x] Add an MCP-friendly Health RouteMap adapter with bounded `healthStatus`, `healthPreview`, and opt-in `healthRepair` tools using normal Voltra route authorization.
- [x] Add a focused demo-site/IaC example with one Health store, live ORM operation recording, a bounded Health monitor, and a public non-destructive MCP/demo surface; production auth/group usage is shown in the consumer example.
- [x] Run build, core tests, demo builds, export checks, and consumer smoke checks; fix regressions. Verified green in GitHub Actions run #342 before final plan/PR-only polish.
- [x] Open and polish PR #405 with implementation, safety, demo/MCP, and verification notes.

## Guardrails

- Health is fully optional and must not alter normal ORM correctness when disabled.
- Normal ORM requests must never start an unbounded repair sweep.
- Destructive repair must be type+ID scoped, idempotent, and independently revalidated.
- Every monitor run must have explicit work limits and resumable continuation.
- Health storage is one logical driver-backed store; do not require DynamoDB-specific infrastructure.
- Keep deployment orchestration out of Voltra: consumers may run the monitor from Lambda, Fargate, cron, queues, or any other TypeScript runtime.
- Preserve existing API/index contracts unless a narrowly scoped health capability requires an additive extension.
- Keep the active plan in `planning/` until the user agrees the effort is finished.
