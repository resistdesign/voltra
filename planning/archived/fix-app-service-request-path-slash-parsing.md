# Fix app service request path slash parsing

## Context

When `RemoteProcedureCall.basePath` and `RemoteProcedureCall.path` are combined by
`src/app/utils/Service.ts` `sendServiceRequest`, leading/trailing slash combinations can produce doubled
slashes.

Example:

- `basePath: "/api"`
- `path: "/method"`
- Current bad request path: `/api//method`

There are route/path parsing utils in the common barrel and `mergeStringPaths` appears involved already, so this plan
tracks root-cause discovery, targeted tests, and regression checks.

## Ordered Checklist

- [x] Phase 1: Reproduce and identify root cause
  - [x] Locate `sendServiceRequest` path construction flow and all path merge points.
  - [x] Reproduce the `"/api" + "/method" => "/api//method"` behavior in a focused test or existing spec.
  - [x] Document exact failure source in this plan before applying a fix.

- [x] Phase 2: Expand test coverage first
  - [x] Add/extend specs for path merge permutations (leading/trailing slash variants, empty path/basePath, existing query/path segments).
  - [x] Confirm tests fail for the bug scenario before the fix.

- [x] Phase 3: Implement fix
  - [x] Update path-merge logic in `sendServiceRequest` (or the actual root source) to normalize slashes correctly.
  - [x] Keep behavior aligned with existing route/path utility semantics.
  - [x] Add doc comments for any newly introduced public helper/type in `src/` (if applicable).

- [x] Phase 4: Regression verification
  - [x] Run targeted tests for touched specs.
  - [x] Run broader relevant test suite (`yarn test` or closest scoped command) to confirm no regressions.
  - [x] Capture verification evidence (commands run + results) in the final update.

## Root Cause Summary

`getFullUrl` in `src/app/utils/Service.ts` called `mergeStringPaths(basePath, path, "/", false, false, false)`.
That `filterEmptyInput=false` setting preserved empty path segments from leading/trailing slashes, so combinations like
`"/api"` + `"/method"` became `"api//method"` (and then `"/api//method"` once normalized for URL output).

## Run Notes

- [x] Root cause summary added
- [x] Test-first evidence captured
- [x] Fix applied
- [x] Regression checks captured

### Evidence

- Failing test-first run (before fix):
  - `yarn tsx src/common/Testing/CLI.ts ./src/app/utils/Service.spec.json`
  - Failed scenarios: `runServiceSlashPrefixedPathUrlScenario`, `runServiceTrailingSlashBasePathUrlScenario`,
    `runServiceSlashBaseAndPathUrlScenario`, `runServiceTrailingSlashBaseOnlyUrlScenario`,
    `runServiceRootPathWithLeadingSlashUrlScenario`.
- Passing targeted run (after fix):
  - `yarn tsx src/common/Testing/CLI.ts ./src/app/utils/Service.spec.json` -> 14 passes, 0 failures.
- Broader regression run:
  - `yarn test:core` -> 803 passes, 0 failures, 0 errors.
