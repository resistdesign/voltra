# Plan: Project-Wide Unused Cleanup (`src` + `site`)

## Goal
Clean up unused locals, parameters, arguments, imports, and related dead symbols across `src/` and `site/` without changing runtime behavior or losing public API exports.

## Constraints
- Preserve all existing public exports and package entrypoint contracts.
- Prefer signature-safe fixes for intentionally unused parameters (prefix with `_`) where required by interface/callback contracts.
- Keep docs/examples/readmes/specs in sync with any code-level symbol renames/removals.
- Validate with existing export checks and test suites.

## Phase 1: Baseline and Inventory
- [x] Run strict unused report for `src` build config (`noUnusedLocals` + `noUnusedParameters`) and capture full list.
- [x] Run equivalent unused diagnostics for `site` code paths/config and capture full list.
- [x] Classify findings by fix strategy.
- [x] Produce a tracked checklist of affected files grouped by module (`src/api`, `src/app`, `src/common`, `src/native`, `src/web`, `site/*`).

### Baseline Findings Snapshot
- `src`: 36 diagnostics across 9 files.
- `site` strict run: 0 unused diagnostics after enabling JSON module resolution for analysis (`--resolveJsonModule`); one baseline config error without that flag in `site/common/DemoTypeInfoMap.ts`.

### Affected Files Checklist (Grouped)
- [x] `src/api`
  - [x] `src/api/DBX/DBXSeed.ts` (unused parameter removed from internal helper signature/call)
  - [x] `src/api/Indexing/API.ts` (unused helper params removed from internal function and call sites)
  - [x] `src/api/ORM/ORMRouteMap.ts` (signature-required unused param normalized with `_` prefix)
  - [x] `src/api/ORM/drivers/DynamoDBDataItemDBDriver.ts` (unused imports/locals removed)
  - [x] `src/api/ORM/drivers/InMemoryDataItemDBDriver.ts` (unused imports/locals removed)
  - [x] `src/api/ORM/drivers/InMemoryFileItemDBDriver.ts` (unused imports/locals removed)
- [x] `src/app`
  - [x] `src/app/forms/types.ts` (unused type import removed)
- [x] `src/common`
  - [x] `src/common/SearchUtils.ts` (intentionally unused comparator args normalized with `_` prefixes)
  - [x] `src/common/TypeParsing/ParsingUtils/getTypeInfoFromFieldFilter.ts` (unused parameters normalized with `_` prefixes)
- [x] `src/native`
  - [x] No current unused diagnostics from this pass.
- [x] `src/web`
  - [x] No current unused diagnostics from this pass.
- [x] `site/*`
  - [x] No current unused diagnostics from this pass.

## Phase 2: `src/` Cleanup
- [x] Clean unused imports in `src/` files.
- [x] Clean unused locals/variables in `src/` files.
- [x] Normalize intentionally unused parameters in `src/` (underscore convention) where signature compatibility is required.
- [x] Remove dead/internal-only declarations in `src/` that are not part of public API.
- [x] Re-run `src` unused diagnostics and confirm zero remaining actionable findings.

## Phase 3: `site/` Cleanup
- [x] Clean unused imports in `site/` files.
- [x] Clean unused locals/variables in `site/` files.
- [x] Normalize intentionally unused parameters in `site/` (underscore convention) where signature compatibility is required.
- [x] Remove dead/internal-only declarations in `site/`.
- [x] Re-run `site` unused diagnostics and confirm zero remaining actionable findings.

## Phase 4: Exports/Docs/Tests Alignment
- [x] Run export contract checks (`yarn test:exports`) and verify no lost exports.
- [x] Update affected docs/doc-comments/readmes/examples/samples for any symbol/name adjustments.
- [x] Update/add JSON spec tests where behavior-visible changes require it.
- [x] Run full verification.
  - [x] `yarn build`
  - [x] `yarn test`
  - [x] `yarn doc`
- [x] Confirm clean status for this scope and summarize remaining risks (if any).

## Completion Criteria
- [x] No unresolved unused diagnostics in targeted `src`/`site` scope except explicitly intentional underscore-args.
- [x] Export surface preserved (no regressions in export checks).
- [x] Tests/docs/examples updated and passing for changed areas.

## Notes
- No public API/export surface changes were introduced by this cleanup.
- No docs/examples/readme/spec fixture updates were required because behavior and public symbols were unchanged.
- Remaining warning in docs build is pre-existing: unknown TypeDoc tag `@allowCustomSelection` in `src/api/ORM/drivers/S3FileItemDBDriver/ConfigTypes.ts`.
