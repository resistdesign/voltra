# Native Barrel And Test Coverage Plan

## Goal
Ensure the native barrel exports are up to date and add targeted tests in `src/native` to reduce regression risk.

## Checklist
- [x] Audit `src/native` barrel exports against modules under `src/native/**`.
- [x] Identify missing/incorrect exports and update barrel files.
- [x] Review existing native specs and identify key behavior gaps.
- [x] Add/extend native specs to cover uncovered barrel-exposed behaviors.
- [x] Run native-focused tests and then full test suite.
- [x] Update plan notes with findings and completion status.
- [x] Eliminate React Native mock SSR warning noise in native test runs.
- [x] Add native forms suite behavioral spec coverage (renderer completeness + key interactions).
- [x] Add native utils/forms barrel integrity specs at sub-barrel level.
- [x] Update native public doc comments where wording is stale after component-based renderer migration.
- [x] Re-run `yarn test:native`, `yarn test`, and `yarn doc` after the native hardening pass.

## Notes
- Fixed native AutoField wrapper to use component invocation (`createElement(nativeAutoField, ...)`) in `src/native/forms/UI.tsx`.
- Added native barrel coverage:
  - `src/native/index.test-utils.ts`
  - `src/native/index.spec.json`
  - `src/native/forms/index.test-utils.ts`
  - `src/native/forms/index.spec.json`
- Added native form renderer contract coverage:
  - `src/native/forms/createNativeFormRenderer.test-utils.ts`
  - `src/native/forms/createNativeFormRenderer.spec.json`
- Validation:
  - `yarn test:native` passes (18 passes).
  - `yarn test` passes (`test:core` + `test:native`).
- Native test run emits expected DOM-server warnings from mocked React Native host tags (`View`, `Text`, `TextInput`) in SSR-based assertions; these are warnings only and do not fail tests.
- Scope expanded for a second pass: remove warning noise, increase native-focused coverage depth, and improve native docs/comments.
- React Native test mock now maps native primitives to DOM-safe host tags/props, eliminating casing and unsupported-prop warning noise during SSR-based tests.
- Added deeper native coverage:
  - `src/native/forms/suite.test-utils.tsx`
  - `src/native/forms/suite.spec.json`
  - `src/native/utils/index.test-utils.ts`
  - `src/native/utils/index.spec.json`
- Updated native suite renderer naming to explicit component-style names in `src/native/forms/suite.ts` (`StringField`, `RelationSingleField`, etc.).
- Added native barrel doc taxonomy annotations in:
  - `src/native/forms/index.ts`
  - `src/native/utils/index.ts`
- Validation rerun after hardening:
  - `yarn test:native` (22 passes)
  - `yarn test` (all passes)
  - `yarn doc` (docs generated at `./docs`)
