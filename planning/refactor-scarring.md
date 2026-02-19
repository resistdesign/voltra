# Refactor Scarring

Recently, a vast quantity of refactoring was done to this project.

The effort is about making sure that leftover effects of that kind of change are repaired and cleaned.

## Goals

### Original Ordered Goals (Authoritative)

1. Orphaned/unused symbols
2. Orphaned/unused files
3. Orphaned/unused code
4. Documentation/demo/sample/example drift
5. Sensible defaults ad present
6. Consistent naming
7. Code readability and maintainability
8. Test coverage
9. Design and architecture are not confusing and provide the easiest possible execution of consuming the provided tools,
   utilities, components and so on.
10. General, all around good project health.

- Ensure there are no orphaned/unused symbols, files, or code paths.
- Ensure documentation/demo/sample behavior still matches source behavior.
- Ensure defaults, naming, readability, maintainability, and architecture consistency are strong.
- Ensure test coverage stays aligned with behavior and public surfaces.

Inspect everything. Be careful. Don't over do it. This project should present as high quality to consumers.
APIs/Surfaces/Mechanisms/Structures should makes sense and impress consumers with the level of thought and detail that
has gone into making something simple and intuitive around every little corner.

Voltra is simplicity, flexibility and abstracts away complexity while providing obvious and easy to use escape hatches.

## Checklist

- [x] Phase 1: Orphan and drift baseline
  - [x] Convert this plan into an actionable checklist with ordered phases.
  - [x] Run scan for orphaned/unused symbols and capture candidates.
  - [x] Run scan for orphaned/unused files and capture candidates.
  - [x] Run scan for obviously orphaned code paths and capture candidates.
  - [x] Apply low-risk fixes found in this phase.
  - [x] Run focused tests for touched areas.
  - [x] Document findings, fixes, and residual risks in this plan.
- [x] Phase 2: API/defaults/naming/maintainability pass
  - [x] Routing contract alignment: `web` should expose `Route` (not `RouteProvider`) and inject web mechanics while preserving the shared Route API shape.
  - [x] Audit defaults and option handling for sensible behavior.
  - [x] Audit naming consistency across modules touched by refactors.
  - [x] Apply targeted readability and maintainability improvements.
  - [x] Add/update docs/comments where public behavior is unclear.
  - [x] Run focused tests for touched areas.
  - [x] Document findings, fixes, and residual risks in this plan.
- [~] Phase 3: Documentation/demo/test coverage alignment
  - [~] Verify docs/site/demo/sample code aligns with current behavior.
  - [~] Fix drift in docs/demo/sample code.
  - [~] Identify missing behavior coverage and add/update nearby JSON specs.
  - [~] Run relevant test suites.
  - [~] Document findings, fixes, and residual risks in this plan.
- [ ] Phase 4: Final health pass
  - [ ] Confirm architecture/surfaces are easy to consume and consistent.
  - [ ] Perform final high-signal cleanup that avoids speculative churn.
  - [ ] Run broad verification (`yarn test` and any impacted build/doc tasks).
  - [ ] Summarize completion evidence and close plan when user confirms.

## Phase 1 Notes (2026-02-19)

- Unused symbol scan:
  - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`
  - Initial failures were unused destructured `error` parameters in:
    - `src/native/forms/suite.ts`
    - `src/web/forms/suite.tsx`
  - Fix applied: removed unused destructured bindings where `renderErrorMessage(context)` already consumes error state.
  - Re-run result: clean (no unused symbol diagnostics).

- Orphaned file/code-path scan:
  - `tsx -e` + `ts-morph` reference scan over `tsconfig.build.json` and `tsconfig.json`.
  - Most unreferenced files are expected package entrypoints or test infrastructure (for example `src/*/index.ts`, `src/common/Testing/CLI.ts`).
  - High-signal drift found:
    - `src/web/utils/Route.tsx` was implemented and tested but not exported from `src/web/utils/index.ts`.
  - Fix applied:
    - Added `export * from "./Route";` to `src/web/utils/index.ts`.

- Focused verification:
  - `tsx src/common/Testing/CLI.ts "./src/web/utils/Route.spec.json" "./src/web/forms/suite.spec.json" "./src/web/index.spec.json"`: passed.
  - Native suite requires native tsconfig mapping; verified with:
    - `yarn test:native`: passed (22 passes, 0 failures, 0 errors).

- Residual risk candidates (not auto-removed in this phase to avoid speculative API churn):
  - Test-only referenced modules:
    - `src/common/StringTransformers.ts`
    - `src/common/TypeInfoDataItemUtils.ts`
    - `src/api/Indexing/Handler.ts`
    - `src/api/DBX/DBXScenarioConfig.ts`
  - Rationale: these may be intentionally retained as utilities or compatibility layers; defer removal to later phase with explicit consumer-surface review.

## Phase 2 Notes (2026-02-19)

- Routing API contract decision captured from user guidance:
  - Consumers should use `Route` consistently across `app`, `native`, and `web`.
  - `web` should not expose a separate consumer-facing `RouteProvider` concept.
  - `web` should provide its own `Route` wrapper that ensures browser mechanics are present in root usage.
  - No cross-barrel re-export strategy for this: keep web behavior in `src/web/utils/Route.tsx`, while internally composing lower-level app route primitives as needed.

- Applied changes for this contract:
  - Replaced web-only `RouteProvider` export with `Route` wrapper in `src/web/utils/Route.tsx`.
  - Wrapper behavior:
    - Matcher mode (`path`/`exact`/`onParamsChange`) delegates directly to core `Route`.
    - Root mode auto-injects a browser adapter only when `adapter` and `ingress` are not provided.
  - Updated `src/web/utils/Route.test-utils.tsx` to validate web-only `Route` usage top-to-bottom (root and nested matcher scenarios), instead of mixing app `Route` in test composition.
  - Added export-contract assertions for web route surface:
    - `Route` export exists.
    - `RouteProvider` export does not exist.
  - Updated `src/web/utils/Route.spec.json` expectations accordingly.
  - Applied minor readability cleanup in `src/web/utils/Route.tsx`:
    - `shouldInjectBrowserAdapter` -> `shouldUseAutoBrowserAdapter`
    - localized `routeProps` variable to avoid repeated casts.

- Verification for this in-progress Phase 2 slice:
  - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
  - `tsx src/common/Testing/CLI.ts "./src/app/utils/Route.spec.json" "./src/web/utils/Route.spec.json" "./src/web/index.spec.json"`: passed.
  - `yarn test:native`: passed (22 passes, 0 failures, 0 errors).

- Defaults/option-handling audit result:
  - Web root route auto-adapter injection remains constrained to root mode and only when `adapter` and `ingress` are not supplied, preserving explicit override paths.
  - Native route runtime integration remains constrained to root mode and non-web runtime.
  - No additional defaults regressions found in this routing slice.

- Naming/readability audit result (routing slice):
  - Public consumer surface now consistently presents `Route` across `app`/`native`/`web`.
  - Web-specific browser mechanics remain implemented in web module code, without cross-barrel re-export strategy.
  - Remaining naming/readability audit across non-routing refactor-touched surfaces is still pending.

- Non-routing defaults and maintainability slice (forms):
  - Added explicit default-behavior coverage for form renderer factories:
    - `src/web/forms/createWebFormRenderer.test-utils.ts`
    - `src/web/forms/createWebFormRenderer.spec.json`
    - `src/native/forms/createNativeFormRenderer.test-utils.ts`
    - `src/native/forms/createNativeFormRenderer.spec.json`
  - New checks assert default suite behavior when no override suite is provided:
    - Web factory emits standard `<input>` path.
    - Native factory emits standard `TextInput` path.
  - Added maintainability comment in `src/app/utils/index.ts` clarifying intentional dual export of:
    - `./EasyLayout` (high-level factory)
    - `./easy-layout` (low-level parser/track helpers)

- Verification for non-routing slice:
  - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
  - `tsx src/common/Testing/CLI.ts "./src/web/forms/createWebFormRenderer.spec.json" "./src/app/forms/index.spec.json"`: passed.
  - `yarn test:native`: passed (23 passes, 0 failures, 0 errors).

- Remaining Phase 2 scope:
  - Continue defaults/naming/readability audit through non-routing app/common utilities that were heavily refactored (beyond routing/forms slices).

- Non-routing utilities slice (service/state/ORM utils):
  - `src/app/utils/Service.ts`
    - Fixed URL normalization so host and merged path are always separated by `/`.
    - Preserved root-path behavior for empty `basePath`/`path` (`https://host:port/`).
    - Updated service spec/test expectations accordingly.
  - `src/app/utils/ApplicationState.tsx`
    - Corrected `setApplicationStateModified` signature to consume `ApplicationStateModificationState` (instead of `ApplicationState`).
    - Hardened `useApplicationStateValue.setModified` to read latest modification map via ref-backed state snapshot, avoiding stale closure writes.
  - `src/app/utils/TypeInfoORMAPIUtils.ts`
    - Replaced broad `for...in` API wrapping iteration with explicit own-key iteration (`Object.keys`) for clearer/safe method enumeration.

- Verification for utilities slice:
  - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
  - `tsx src/common/Testing/CLI.ts "./src/app/utils/Service.spec.json" "./src/app/utils/Controller.spec.json" "./src/app/utils/ApplicationState.spec.json"`: passed.
  - `tsx src/common/Testing/CLI.ts "./src/app/utils/TypeInfoORMAPIUtils.spec.json" "./src/app/utils/TypeInfoORMClient.spec.json" "./src/app/utils/Service.spec.json" "./src/app/utils/ApplicationState.spec.json"`: passed.

- Remaining Phase 2 scope update:
  - Continue through additional non-routing `app/common` modules, prioritizing defaults and naming consistency where refactor impact was broad.

- Additional utility audit observations:
  - `src/app/utils/History.ts` and `src/app/utils/Debug.ts` reviewed for default/path semantics and naming consistency; no high-confidence behavior regressions identified in this pass.
  - Existing `History` and `Debug` specs already cover core parse/build semantics and dependency-index diff behavior.

- `src/common` search utility slice:
  - Fixed OR-logic filtering behavior in `src/common/SearchUtils.ts`.
    - Previous behavior initialized OR evaluation as truthy for each item, causing false-positive matches.
    - Updated behavior initializes OR evaluation as false when field criteria are present, producing correct logical-OR filtering.
  - Updated `src/common/SearchUtils.spec.json` expectation to match corrected semantics (`filteredOrIds` now returns only true matches).

- Verification for `src/common` slice:
  - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
  - `tsx src/common/Testing/CLI.ts "./src/common/SearchUtils.spec.json" "./src/common/SearchValidation.spec.json" "./src/common/SearchTypes.spec.json"`: passed.
  - `yarn test`: passed (core: 191 passes, 0 failures, 0 errors; native: 23 passes, 0 failures, 0 errors).

- `src/common` command-line utility slice:
  - Readability/maintainability cleanup in `src/common/CommandLine/collectRequiredEnvironmentVariables.ts`:
    - clearer local names (`varName` instead of abbreviated loop variables)
    - kept behavior unchanged for missing-variable validation and error rendering.
  - Verification:
    - `tsx src/common/Testing/CLI.ts "./src/common/CommandLine/collectRequiredEnvironmentVariables.spec.json"`: passed.
    - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.

- `src/common/TypeParsing` selection-helper slice:
  - Updated `src/common/TypeParsing/Utils.ts` selected-field filtering helpers to preserve caller-provided selected-field order.
    - `removeNonexistentFieldsFromSelectedFields` now filters directly over `selectedFields` order.
    - `removeTypeReferenceFieldsFromSelectedFields` now filters directly over `selectedFields` order and field metadata.
  - Updated `src/common/TypeParsing/Utils.test-utils.ts` + `src/common/TypeParsing/Utils.spec.json` to assert order preservation explicitly.
  - Verification:
    - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
    - `tsx src/common/Testing/CLI.ts "./src/common/TypeParsing/Utils.spec.json" "./src/common/TypeParsing/Validation.spec.json" "./src/common/TypeParsing/ValidationDataItem.spec.json"`: passed.

- `src/common` logging/testing utility slice:
  - Hardened logging serialization in `src/common/Logging/Utils.ts`:
    - Added `stringifyForLog` fallback to prevent `JSON.stringify` crashes (for example circular objects) from interrupting wrapped calls when logging is enabled.
  - Updated logging scenario coverage:
    - `src/common/Logging/Utils.test-utils.ts`
    - `src/common/Logging/Utils.spec.json`
    - Added circular-input case to ensure logging stays resilient and call result still returns.
  - Verification:
    - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
    - `tsx src/common/Testing/CLI.ts "./src/common/Logging/Utils.spec.json" "./src/common/Testing/Utils.spec.json"`: passed.
    - `yarn test`: passed (core: 191 passes, 0 failures, 0 errors; native: 23 passes, 0 failures, 0 errors).

- `src/app/utils/Service` normalization slice:
  - Hardened URL construction defaults in `src/app/utils/Service.ts`:
    - protocol normalization supports both `"https"` and `"https:"` inputs.
    - domain normalization removes trailing slashes to avoid malformed `//` joins.
    - existing host/path slash normalization behavior retained.
  - Expanded service scenario expectations in:
    - `src/app/utils/Service.test-utils.ts`
    - `src/app/utils/Service.spec.json`
    - Added explicit checks for normalized protocol/domain inputs.
  - Verification:
    - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
    - `tsx src/common/Testing/CLI.ts "./src/app/utils/Service.spec.json" "./src/app/utils/ApplicationState.spec.json" "./src/app/utils/TypeInfoORMClient.spec.json"`: passed.
    - `yarn test`: passed (core: 191 passes, 0 failures, 0 errors; native: 23 passes, 0 failures, 0 errors).

- `src/app/utils/Controller` edge-case slice:
  - Fixed array-index controller behavior for missing parent arrays in `src/app/utils/Controller.ts`.
    - Previous behavior could swallow an error and no-op when `isArrayIndex === true` and `parentValue` was `undefined`.
    - Updated behavior initializes from an empty array in this case, then applies the indexed write.
  - Small readability cleanup for ignored catch variables (`_error`) in the same file.
  - Expanded controller scenario coverage:
    - `src/app/utils/Controller.test-utils.ts`
    - `src/app/utils/Controller.spec.json`
    - Added missing-array-index assertion to lock in fallback behavior.
  - Verification:
    - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
    - `tsx src/common/Testing/CLI.ts "./src/app/utils/Controller.spec.json" "./src/app/utils/ApplicationStateLoader.spec.json" "./src/app/utils/ApplicationState.spec.json"`: passed.
    - `yarn test`: passed (core: 191 passes, 0 failures, 0 errors; native: 23 passes, 0 failures, 0 errors).

- `src/common/TypeParsing/ParsingUtils` union field-set slice:
  - Hardened `Pick`/`Omit`/`Exclude` filtering of union field sets in `src/common/TypeParsing/ParsingUtils/getTypeInfoFromFieldFilter.ts`.
    - Previous behavior could retain empty union member field sets after field-filter transforms.
    - Updated behavior drops empty sets so downstream union metadata remains meaningful and does not include impossible variants.
  - Expanded scenario coverage in:
    - `src/common/TypeParsing/ParsingUtils/ParsingUtils.test-utils.ts`
    - `src/common/TypeParsing/ParsingUtils/ParsingUtils.spec.json`
    - Added `UnionPicked` assertion to lock in non-empty `unionFieldSets` output (`[["id"]]`).
  - Verification:
    - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
    - `tsx src/common/Testing/CLI.ts "./src/common/TypeParsing/ParsingUtils/ParsingUtils.spec.json" "./src/common/TypeParsing/Utils.spec.json"`: passed.
    - `yarn test`: passed (core: 191 passes, 0 failures, 0 errors; native: 23 passes, 0 failures, 0 errors).

- Remaining Phase 2 scope update:
  - Continue app/common naming/readability/defaults sweep for additional high-confidence non-routing utility surfaces, then consolidate and close Phase 2 checklist rows once the pass is complete.

- Phase 2 completion summary:
  - Completed defaults, naming, maintainability, and behavior-hardening slices across web/app/common routing and utility surfaces.
  - All Phase 2 changes were verified with strict compile checks plus focused and repeated full-suite test runs.
  - Final verification snapshot for Phase 2 close:
    - `yarn -s tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters`: passed.
    - `yarn test`: passed (core: 191 passes, 0 failures, 0 errors; native: 23 passes, 0 failures, 0 errors).

## Phase 3 Notes (2026-02-19)

- Documentation/demo drift slice (routing usage):
  - Updated demo site routing consumption to use platform `Route` from the web barrel:
    - `site/app/src/client/App.tsx`
    - Import changed from `src/app/utils` to `src/web`.
  - Updated README routing section to reflect platform-specific route entrypoints:
    - `README.md`
    - Reframed guidance from app-only routing to shared `Route` API with platform barrel usage.
    - Added explicit web and native route import examples.

- Verification for this Phase 3 slice:
  - `tsx src/common/Testing/CLI.ts "./src/web/index.spec.json" "./src/web/utils/Route.spec.json" "./src/app/index.spec.json"`: passed.
  - `yarn site:build:app`: passed (Astro build + Typedoc + doc copy completed).

- Additional coverage alignment slice (TypeParsing unions):
  - Added explicit `Exclude` branch coverage for cleaned union field sets:
    - `src/common/TypeParsing/ParsingUtils/ParsingUtils.test-utils.ts`
    - `src/common/TypeParsing/ParsingUtils/ParsingUtils.spec.json`
  - New assertion (`unionExcludedFieldSets`) confirms empty union sets are removed after exclude filtering while preserving valid surviving sets.
  - Verification:
    - `tsx src/common/Testing/CLI.ts "./src/common/TypeParsing/ParsingUtils/ParsingUtils.spec.json"`: passed.
    - `yarn test`: passed (core: 191 passes, 0 failures, 0 errors; native: 23 passes, 0 failures, 0 errors).

- Remaining Phase 3 scope:
  - Continue scanning docs/site/demo/example surfaces for additional drift beyond routing wording.
  - Identify and add any missing behavior coverage surfaced by remaining drift findings.
