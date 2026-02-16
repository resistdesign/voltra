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

- [ ] Export all approved missing types from their relevant barrels.
- [ ] Validate exports with tests/build checks after updates.
