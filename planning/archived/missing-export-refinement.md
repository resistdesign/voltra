# Missing Export Refinement

Things like `TypeInfoField` are exported from the `common` barrel, but `LiteralValue` is not.

This is a major problem because that time is very much needed.

And so are any other types that exported types refer to.

In all barrels.

We need to make absolutely certain that we are not missing important types to be exported for consumers.

## Phase 1: Report Missing Types

- [x] Collect and list all types not exported for approval to export.
- [x] Skip generated AWS IaC resource types from this reporting pass.
- [x] Generate and persist report artifacts:
  - `planning/missing-export-refinement-report.md`
  - `planning/missing-export-refinement-report.json`
- [x] Summary of current report:
  - 21 barrels with missing type references
  - 168 barrel-scoped missing type entries
  - 73 unique missing type names

## Phase 2: Export Missing Types

- [x] Export all approved missing types from their relevant barrels.
- [x] Validate exports with tests/build checks after updates.
  - `yarn build` (completed successfully on 2026-02-16)

## Phase 3: Export Surface Refinement

- [x] Rename `CORSPatter` to `CORSPattern` across API/router surfaces.
- [x] Preserve compatibility for consumers that may still use `CORSPatter`.
  - `src/api/Router/Types.ts` now exports both `CORSPattern` and `CORSPatter` (alias) without deprecation tags.
- [x] Audit barrels for duplicate named exports and remove duplicates.
  - Deduped generated type dependency re-exports against existing barrel exports.
  - Verified with export-overlap audit: `NO_DUPLICATE_EXPORT_NAMES_IN_BARRELS`.
- [x] Re-run build validation after refactor and dedupe updates.
  - `yarn build` (completed successfully on 2026-02-16)

## Phase 4: Barrel-to-Barrel Audit

- [x] Enumerate all barrel files re-exporting from other barrel files.
  - Current count: `20` barrel-to-barrel re-exports.
- [x] Validate current state builds after reverting oversized explicit aggregate lists.
  - `yarn build` (completed successfully on 2026-02-16)

## Phase 5: Coverage and Output Validation

- [x] Sweep docs/readmes/examples for naming and export-surface consistency.
  - Confirmed no lingering `CORSPatter` usage in source/docs/examples except intentional alias declaration.
  - Confirmed no `@deprecated` tags in source.
- [x] Run test suite and fix any breakages.
  - `yarn test` (PASSES: 194, FAILURES: 0, ERRORS: 0)
- [x] Regenerate API docs and verify output reflects current types.
  - `yarn doc` (passes cleanly)
  - Fixed a TypeDoc-breaking export-kind issue by exporting `DACConstraintType` as a runtime symbol in `src/api/ORM/index.ts`.
  - Updated doc comment wording in `src/common/TypeInfoORM/Types.ts` to remove unresolved TypeDoc link warning.
- [x] Run site/docs app build validation for generated output integrity.
  - `yarn site:build:app` (passes; includes known Astro chunk-size warning)
  - `yarn build` (passes)
