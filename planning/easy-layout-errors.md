# EasyLayout Errors

## Goals
- Eliminate runtime warnings caused by creating styled-components dynamically inside render paths.
- Keep EasyLayout API behavior unchanged while switching to static base styled components with dynamic props.
- Verify existing EasyLayout parsing tests still pass after the refactor.

## Checklist
- [x] Capture the problem statement and required approach.
- [x] Inspect current `src/web/utils/EasyLayout.tsx` and shared core usage.
- [x] Refactor `styledFactory` to use module-level styled components with props for dynamic layout values.
- [x] Run verification tests for EasyLayout and confirm no regressions.
- [x] Record completion status and remaining work in this plan.
- [x] Review and update EasyLayout docs/doc comments for the new static-styled approach.
- [x] Add or update tests covering web EasyLayout component wiring (layout/area props and base forwarding).
- [x] Re-run tests and record verification for documentation/test updates.
- [x] Fix failing web EasyLayout regression tests to inspect rendered wrapper output correctly.
- [x] Re-run full test suite (`yarn test`) and confirm green.

## Notes
Runtime warnings reported in browser demo:
- React Hooks warning related to calling hooks from non-top-level contexts.
- styled-components warning: dynamic creation of `styled.div` within component/render paths.

Required direction:
- Do not call `styled` inside render-derived code paths.
- Use pre-defined styled components that accept dynamic values via props.

## Completion
- Refactor implemented in `src/web/utils/EasyLayout.tsx`:
  - Added module-level `EasyLayoutBase` and `EasyAreaBase` styled components.
  - Switched dynamic values to transient props (`$layoutCss`, `$area`).
  - Replaced dynamic `styled(base)` calls with wrapper components that pass `as={base}` when provided.
  - Switched styled import to `src/app/helpers/styled` compatibility helper used by web modules.
- Verification:
  - `yarn test ./src/web/utils/EasyLayout.spec.json`
  - Result: `PASSES: 177`, `FAILURES: 0`, `ERRORS: 0`.
  - Re-run after docs/test updates:
    - `yarn test ./src/web/utils/EasyLayout.spec.json`
    - Result: `PASSES: 179`, `FAILURES: 0`, `ERRORS: 0`.
  - Regression validation:
    - `yarn test`
    - Result: `PASSES: 179`, `FAILURES: 0`, `ERRORS: 0`.
