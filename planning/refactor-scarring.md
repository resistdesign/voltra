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
- [~] Phase 2: API/defaults/naming/maintainability pass
  - [x] Routing contract alignment: `web` should expose `Route` (not `RouteProvider`) and inject web mechanics while preserving the shared Route API shape.
  - [x] Audit defaults and option handling for sensible behavior.
  - [x] Audit naming consistency across modules touched by refactors.
  - [x] Apply targeted readability and maintainability improvements.
  - [x] Add/update docs/comments where public behavior is unclear.
  - [x] Run focused tests for touched areas.
  - [x] Document findings, fixes, and residual risks in this plan.
- [ ] Phase 3: Documentation/demo/test coverage alignment
  - [ ] Verify docs/site/demo/sample code aligns with current behavior.
  - [ ] Fix drift in docs/demo/sample code.
  - [ ] Identify missing behavior coverage and add/update nearby JSON specs.
  - [ ] Run relevant test suites.
  - [ ] Document findings, fixes, and residual risks in this plan.
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
