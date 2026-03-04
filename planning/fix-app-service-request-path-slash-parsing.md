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

- [ ] Phase 1: Reproduce and identify root cause
  - [ ] Locate `sendServiceRequest` path construction flow and all path merge points.
  - [ ] Reproduce the `"/api" + "/method" => "/api//method"` behavior in a focused test or existing spec.
  - [ ] Document exact failure source in this plan before applying a fix.

- [ ] Phase 2: Expand test coverage first
  - [ ] Add/extend specs for path merge permutations (leading/trailing slash variants, empty path/basePath, existing query/path segments).
  - [ ] Confirm tests fail for the bug scenario before the fix.

- [ ] Phase 3: Implement fix
  - [ ] Update path-merge logic in `sendServiceRequest` (or the actual root source) to normalize slashes correctly.
  - [ ] Keep behavior aligned with existing route/path utility semantics.
  - [ ] Add doc comments for any newly introduced public helper/type in `src/` (if applicable).

- [ ] Phase 4: Regression verification
  - [ ] Run targeted tests for touched specs.
  - [ ] Run broader relevant test suite (`yarn test` or closest scoped command) to confirm no regressions.
  - [ ] Capture verification evidence (commands run + results) in the final update.

## Run Notes

- [ ] Root cause summary added
- [ ] Test-first evidence captured
- [ ] Fix applied
- [ ] Regression checks captured
