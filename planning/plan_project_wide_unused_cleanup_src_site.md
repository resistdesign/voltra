# Plan: Project-Wide Unused Cleanup (`src` + `site`)

## Goal
Clean up unused locals, parameters, arguments, imports, and related dead symbols across `src/` and `site/` without changing runtime behavior or losing public API exports.

## Constraints
- Preserve all existing public exports and package entrypoint contracts.
- Prefer signature-safe fixes for intentionally unused parameters (prefix with `_`) where required by interface/callback contracts.
- Keep docs/examples/readmes/specs in sync with any code-level symbol renames/removals.
- Validate with existing export checks and test suites.

## Phase 1: Baseline and Inventory
- [ ] Run strict unused report for `src` build config (`noUnusedLocals` + `noUnusedParameters`) and capture full list.
- [ ] Run equivalent unused diagnostics for `site` code paths/config and capture full list.
- [ ] Classify findings by fix strategy:
  - [ ] remove truly dead locals/imports
  - [ ] underscore-prefix intentionally unused parameters
  - [ ] remove dead private types/helpers
  - [ ] preserve public API symbols (no export regressions)
- [ ] Produce a tracked checklist of affected files grouped by module (`src/api`, `src/app`, `src/common`, `src/native`, `src/web`, `site/*`).

## Phase 2: `src/` Cleanup
- [ ] Clean unused imports in `src/` files.
- [ ] Clean unused locals/variables in `src/` files.
- [ ] Normalize intentionally unused parameters in `src/` (underscore convention) where signature compatibility is required.
- [ ] Remove dead/internal-only declarations in `src/` that are not part of public API.
- [ ] Re-run `src` unused diagnostics and confirm zero remaining actionable findings.

## Phase 3: `site/` Cleanup
- [ ] Clean unused imports in `site/` files.
- [ ] Clean unused locals/variables in `site/` files.
- [ ] Normalize intentionally unused parameters in `site/` (underscore convention) where signature compatibility is required.
- [ ] Remove dead/internal-only declarations in `site/`.
- [ ] Re-run `site` unused diagnostics and confirm zero remaining actionable findings.

## Phase 4: Exports/Docs/Tests Alignment
- [ ] Run export contract checks (`yarn test:exports`) and verify no lost exports.
- [ ] Update affected docs/doc-comments/readmes/examples/samples for any symbol/name adjustments.
- [ ] Update/add JSON spec tests where behavior-visible changes require it.
- [ ] Run full verification:
  - [ ] `yarn build`
  - [ ] `yarn test`
  - [ ] `yarn doc`
- [ ] Confirm clean status for this scope and summarize remaining risks (if any).

## Completion Criteria
- [ ] No unresolved unused diagnostics in targeted `src`/`site` scope except explicitly intentional underscore-args.
- [ ] Export surface preserved (no regressions in export checks).
- [ ] Tests/docs/examples updated and passing for changed areas.
