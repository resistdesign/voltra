# Component-Based Form Suite Redesign Plan

## Goal
Redesign the form suite architecture so field renderers are React components (hook-capable), replacing render-function style rendering to eliminate inline/raw handler instances and enable `useCallback`-based handler stability.

## Checklist
- [x] Audit current form suite contracts and renderer invocation flow in `src/app/forms/core`.
- [x] Introduce component-based renderer contracts in core types and renderer pipeline.
- [x] Update default web suite implementation to use component renderers.
- [x] Preserve behavior for relation/custom/array/primitive rendering and submit flow.
- [x] Update tests/specs impacted by API contract changes.
- [x] Run full test suite and fix regressions.
- [x] Document migration notes in plan and mark completion.

## Migration Notes
- `createAutoField` now returns a React component and dispatches field renderers via `createElement(...)` rather than direct function invocation.
- Suite renderers in `ComponentSuite.renderers` are now treated as renderer components (hook-capable), which allows proper React lifecycle/hook semantics.
- Core suite utility tests were updated to assert rendered output via server-rendered markup checks instead of direct string-return renderers.
- Web UI field-test helpers now resolve function components during element-tree inspection so existing payload assertions remain valid under component dispatch.
