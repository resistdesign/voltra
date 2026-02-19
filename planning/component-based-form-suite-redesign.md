# Component-Based Form Suite Redesign Plan

## Goal
Redesign the form suite architecture so field renderers are React components (hook-capable), replacing render-function style rendering to eliminate inline/raw handler instances and enable `useCallback`-based handler stability.

## Checklist
- [ ] Audit current form suite contracts and renderer invocation flow in `src/app/forms/core`.
- [ ] Introduce component-based renderer contracts in core types and renderer pipeline.
- [ ] Update default web suite implementation to use component renderers.
- [ ] Preserve behavior for relation/custom/array/primitive rendering and submit flow.
- [ ] Update tests/specs impacted by API contract changes.
- [ ] Run full test suite and fix regressions.
- [ ] Document migration notes in plan and mark completion.
