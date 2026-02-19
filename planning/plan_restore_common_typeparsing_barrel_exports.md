# Plan: Export Surface Recovery and Barrel Directness

Goal: Keep Voltra's public exports intact while eliminating selective re-exports, making export chains direct (`export *`)
through barrel indexes, cleaning unused imports introduced/exposed by this work, and revalidating docs/tests/examples.

## Phase 1 — Baseline and inventory

- [x] Capture baseline public export surface for top-level package entrypoints.
- [x] Inventory all selective re-exports (`export { ... } from ...`, `export type { ... } from ...`) across repo code.
- [x] Identify index-chain hot spots where exported modules can be missed unless barrel exports are broad/direct.

## Phase 2 — Remove selective re-exports without losing exports

- [x] Replace selective re-exports with non-selective/direct-chain exports in `src/` barrels.
- [x] Preserve any alias exports currently depended on by moving alias declarations into owning modules when needed.
- [x] Ensure files like `src/api/Indexing/ddb/Types.ts` remain exported up the barrel chain.
- [x] Verify top-level entrypoint export surface is preserved (no unintended removals).

## Phase 3 — Unused imports cleanup

- [x] Detect unused imports after export refactor.
- [x] Remove unused imports in affected files while preserving behavior and docs.

## Phase 4 — Validation and docs consistency

- [x] Run `yarn test:exports`.
- [x] Run `yarn build`.
- [x] Run `yarn test`.
- [x] Run `yarn doc`.
- [x] Spot-check README/examples/site/source docs for stale export usage caused by this pass.

## Phase 5 — Plan state update

- [x] Update this plan checklist with completion state.
