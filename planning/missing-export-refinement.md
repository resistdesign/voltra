# Missing Export Refinement

Things like `TypeInfoField` are exported from the `common` barrel, but `LiteralValue` is not.

This is a major problem because that time is very much needed.

And so are any other types that exported types refer to.

In all barrels.

We need to make absolute certain that we are not missing important types to be exported for consumers.

## Phase 1: Report Missing Types

1. Collect and list all types not exported for approval to export.

- Skip the generated AWS IaC Resource types. (We might export that, but no need to list.)

## Phase 2: Export Missing Types

1. All types that have been approved will be exported.
