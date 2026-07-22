# Link & Lock Reference Implementations

## Goal

Preserve the current structured-index pagination, filtering, and global-sorting solutions as working reference implementations before evaluating a one-index-table design.

## Checklist

- [x] Create `feat/link-and-lock` from `main`.
- [x] Retarget PR #387 to `feat/link-and-lock`.
- [x] Add the current problem/solution ledger to the repository.
- [x] Replace the single compound cursor with deterministic positional source cursors.
- [x] Consume bounded backend pages atomically and retain composed overflow.
- [x] Verify compound criteria against stored structured document fields.
- [x] Deduplicate OR results through deterministic first-source ownership.
- [x] Fill visible ORM pages across hydration and DAC rejections.
- [x] Propagate cursor/backend failures instead of silently scanning.
- [x] Traverse a suitable sort-field index before criterion verification.
- [x] Preserve numeric ordering in persisted range keys.
- [x] Add exhaustion, compound, sorting, numeric, and ORM regression coverage.
- [x] Run focused specs, the full core suite, and the build.
- [x] Commit, push, and open a draft PR targeting `feat/link-and-lock`.

## Scope Boundary

The data-skipping/index-block layer is captured as a designed optimization. Its physical table layout remains intentionally separate from this reference implementation because the next design phase will evaluate consolidating the current physical index tables.
